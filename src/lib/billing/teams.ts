import type { GardenBillingSettings, GardenMember, GardenTransaction, MemberAdjustment, Task } from "@/types/domain";

export type BillingPeriodRange = { startsOn: string; endsOn: string };

export type TeamMemberRow = {
  userId: string;
  displayName: string;
  slotId: string;
  isActive: boolean;
  joinedOn: string;
  leftOn: string | null;
  presenceDays: number;
  workCents: number;
  expenseCents: number;
  adjustmentCents: number;
  contributionCents: number;
  teamShareCents: number;
  transferCents: number;
  balanceCents: number;
};

export type TeamSlot = {
  slotId: string;
  presenceDays: number;
  contributionCents: number;
  fairShareCents: number;
  teamBalanceCents: number;
  members: TeamMemberRow[];
};

export type TeamBilling = {
  potCents: number;
  slots: TeamSlot[];
  rows: TeamMemberRow[];
};

type BillingInput = {
  members: Pick<GardenMember, "user_id" | "slot_id" | "joined_on" | "left_on" | "is_active" | "profiles">[];
  tasks: Pick<Task, "status" | "completed_by" | "completed_at" | "points">[];
  transactions: Pick<GardenTransaction, "type" | "paid_by" | "paid_to" | "amount_cents" | "occurred_on">[];
  adjustments: Pick<MemberAdjustment, "user_id" | "points_delta" | "amount_cents_delta" | "created_at">[];
  settings: GardenBillingSettings;
  period: BillingPeriodRange;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(isoDate: string) {
  return Math.round(new Date(`${isoDate}T00:00:00.000Z`).getTime() / DAY_MS);
}

// Timestamps are stored in UTC, the household lives in Germany.
function localDate(timestamp: string) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date(timestamp));
}

function inPeriod(isoDate: string, period: BillingPeriodRange) {
  return isoDate >= period.startsOn && isoDate <= period.endsOn;
}

export function presenceDays(joinedOn: string, leftOn: string | null, period: BillingPeriodRange) {
  const start = Math.max(dayNumber(joinedOn), dayNumber(period.startsOn));
  const end = Math.min(dayNumber(leftOn ?? period.endsOn), dayNumber(period.endsOn));
  return Math.max(0, end - start + 1);
}

export function splitCents(total: number, weights: number[]) {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

  if (weights.length === 0) {
    return [];
  }

  if (weightSum <= 0) {
    return splitCents(total, weights.map(() => 1));
  }

  const sign = total < 0 ? -1 : 1;
  const absolute = Math.abs(total);
  const raw = weights.map((weight) => (absolute * weight) / weightSum);
  const parts = raw.map(Math.floor);
  let remainder = absolute - parts.reduce((sum, part) => sum + part, 0);
  const byFraction = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const { index } of byFraction) {
    if (remainder <= 0) {
      break;
    }
    parts[index] += 1;
    remainder -= 1;
  }

  return parts.map((part) => part * sign || 0);
}

export function calculateTeamBilling({ members, tasks, transactions, adjustments, settings, period }: BillingInput): TeamBilling {
  const centsPerPoint = settings.point_hours * settings.hourly_rate_cents;
  const periodTransactions = transactions.filter((transaction) => inPeriod(transaction.occurred_on, period));
  const periodAdjustments = adjustments.filter((adjustment) => inPeriod(localDate(adjustment.created_at), period));
  const periodTasks = tasks.filter(
    (task) => task.status === "done" && task.completed_by && task.completed_at && inPeriod(localDate(task.completed_at), period),
  );

  const rows: TeamMemberRow[] = members
    .map((member) => {
      const days = presenceDays(member.joined_on, member.left_on, period);
      const points = periodTasks
        .filter((task) => task.completed_by === member.user_id)
        .reduce((sum, task) => sum + task.points, 0);
      const ownAdjustments = periodAdjustments.filter((adjustment) => adjustment.user_id === member.user_id);
      const adjustmentPoints = ownAdjustments.reduce((sum, adjustment) => sum + adjustment.points_delta, 0);
      const workCents = Math.round((points + adjustmentPoints) * centsPerPoint);
      const adjustmentCents = ownAdjustments.reduce((sum, adjustment) => sum + adjustment.amount_cents_delta, 0);
      const expenseCents = periodTransactions
        .filter((transaction) => transaction.paid_by === member.user_id && (transaction.type === "expense" || !transaction.paid_to))
        .reduce((sum, transaction) => sum + transaction.amount_cents, 0);

      return {
        userId: member.user_id,
        displayName: member.profiles?.display_name ?? "Mitglied",
        slotId: member.slot_id,
        isActive: member.is_active,
        joinedOn: member.joined_on,
        leftOn: member.left_on,
        presenceDays: days,
        workCents,
        expenseCents,
        adjustmentCents,
        contributionCents: workCents + expenseCents + adjustmentCents,
        teamShareCents: 0,
        transferCents: 0,
        balanceCents: 0,
      };
    })
    .filter((row) =>
      row.presenceDays > 0
      || row.contributionCents !== 0
      || periodTransactions.some((transaction) => transaction.paid_by === row.userId || transaction.paid_to === row.userId),
    );

  const knownUsers = new Set(rows.map((row) => row.userId));
  for (const transaction of periodTransactions) {
    if (transaction.type !== "payment" || !transaction.paid_to || !knownUsers.has(transaction.paid_to) || !knownUsers.has(transaction.paid_by)) {
      continue;
    }
    const payer = rows.find((row) => row.userId === transaction.paid_by);
    const receiver = rows.find((row) => row.userId === transaction.paid_to);
    if (payer && receiver) {
      payer.transferCents += transaction.amount_cents;
      receiver.transferCents -= transaction.amount_cents;
    }
  }

  const potCents = rows.reduce((sum, row) => sum + row.contributionCents, 0);
  const slotIds = [...new Set(rows.map((row) => row.slotId))];
  const slotMembers = slotIds.map((slotId) => rows.filter((row) => row.slotId === slotId));
  const slotDays = slotMembers.map((team) => team.reduce((sum, row) => sum + row.presenceDays, 0));
  const fairShares = splitCents(potCents, slotDays);

  const slots = slotIds.map((slotId, index) => {
    const team = slotMembers[index];
    const contributionCents = team.reduce((sum, row) => sum + row.contributionCents, 0);
    const teamBalanceCents = contributionCents - fairShares[index];
    const weights = teamBalanceCents < 0
      ? team.map((row) => row.presenceDays)
      : team.map((row) => Math.max(0, row.contributionCents));
    const shares = splitCents(teamBalanceCents, weights.some((weight) => weight > 0) ? weights : team.map((row) => row.presenceDays));

    team.forEach((row, memberIndex) => {
      row.teamShareCents = shares[memberIndex];
      row.balanceCents = shares[memberIndex] + row.transferCents;
    });

    return {
      slotId,
      presenceDays: slotDays[index],
      contributionCents,
      fairShareCents: fairShares[index],
      teamBalanceCents,
      members: team,
    };
  });

  return { potCents, slots, rows };
}
