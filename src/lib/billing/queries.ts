import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { GardenBillingSettings, GardenMember, GardenTransaction, MemberAdjustment, Task } from "@/types/domain";

export async function getBillingSettings(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<GardenBillingSettings> {
  const { data, error } = await supabase
    .from("garden_billing_settings")
    .select("garden_id,hourly_rate_cents,point_hours")
    .eq("garden_id", gardenId)
    .maybeSingle();

  if (error) {
    console.error("getBillingSettings", error.message);
  }

  return data ?? { garden_id: gardenId, hourly_rate_cents: 1000, point_hours: 1 };
}

export async function getGardenTransactions(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<GardenTransaction[]> {
  const { data, error } = await supabase
    .from("garden_transactions")
    .select("id,garden_id,type,title,amount_cents,paid_by,paid_to,occurred_on,note,created_by,created_at,paid_by_profile:profiles!garden_transactions_paid_by_fkey(id,display_name),paid_to_profile:profiles!garden_transactions_paid_to_fkey(id,display_name)")
    .eq("garden_id", gardenId)
    .order("occurred_on", { ascending: false });

  if (error) {
    console.error("getGardenTransactions", error.message);
    return [];
  }

  return (data ?? []).map((transaction) => ({
    ...transaction,
    paid_by_profile: Array.isArray(transaction.paid_by_profile)
      ? transaction.paid_by_profile[0] ?? null
      : transaction.paid_by_profile,
    paid_to_profile: Array.isArray(transaction.paid_to_profile)
      ? transaction.paid_to_profile[0] ?? null
      : transaction.paid_to_profile,
  })) as GardenTransaction[];
}

export type BillingRow = {
  userId: string;
  displayName: string;
  workCents: number;
  expenseCents: number;
  paidOutCents: number;
  receivedCents: number;
  contributionCents: number;
  fairShareCents: number;
  balanceCents: number;
};

export function calculateBilling(
  members: GardenMember[],
  tasks: Task[],
  transactions: GardenTransaction[],
  settings: GardenBillingSettings,
  adjustments: MemberAdjustment[] = [],
) {
  const activeMembers = members.filter((member) => member.is_active);
  const memberCount = Math.max(activeMembers.length, 1);
  const rows = activeMembers.map((member) => {
    const points = tasks
      .filter((task) => task.status === "done" && task.completed_by === member.user_id)
      .reduce((sum, task) => sum + task.points, 0);
    const workCents = Math.round(points * settings.point_hours * settings.hourly_rate_cents);
    const adjustmentWorkCents = Math.round(
      adjustments
        .filter((adjustment) => adjustment.user_id === member.user_id)
        .reduce((sum, adjustment) => sum + adjustment.points_delta, 0)
        * settings.point_hours
        * settings.hourly_rate_cents,
    );
    const adjustmentAmountCents = adjustments
      .filter((adjustment) => adjustment.user_id === member.user_id)
      .reduce((sum, adjustment) => sum + adjustment.amount_cents_delta, 0);
    const expenseCents = transactions
      .filter((transaction) => transaction.type === "expense" && transaction.paid_by === member.user_id)
      .reduce((sum, transaction) => sum + transaction.amount_cents, 0);
    const paidOutCents = transactions
      .filter((transaction) => transaction.type === "payment" && transaction.paid_by === member.user_id)
      .reduce((sum, transaction) => sum + transaction.amount_cents, 0);
    const receivedCents = transactions
      .filter((transaction) => transaction.type === "payment" && transaction.paid_to === member.user_id)
      .reduce((sum, transaction) => sum + transaction.amount_cents, 0);

    return {
      userId: member.user_id,
      displayName: member.profiles?.display_name ?? "Mitglied",
      workCents: workCents + adjustmentWorkCents,
      expenseCents,
      paidOutCents,
      receivedCents,
      contributionCents: workCents + adjustmentWorkCents + adjustmentAmountCents + expenseCents + paidOutCents - receivedCents,
      fairShareCents: 0,
      balanceCents: 0,
    };
  });
  const totalContributions = rows.reduce((sum, row) => sum + row.workCents + row.expenseCents, 0);
  const fairShareCents = Math.round(totalContributions / memberCount);

  return rows.map((row) => ({
    ...row,
    fairShareCents,
    balanceCents: row.contributionCents - fairShareCents,
  }));
}
