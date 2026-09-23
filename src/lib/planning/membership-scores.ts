import type { GardenMember, ScoreRow, Task } from "@/types/domain";

type MembershipHistory = Pick<GardenMember, "user_id" | "slot_id" | "joined_on" | "left_on" | "is_active">;
type DoneTask = Pick<Task, "status" | "completed_by" | "points">;

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`).getTime();
  const end = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((end - start) / DAY_MS));
}

function donePoints(tasks: DoneTask[], userId: string) {
  return tasks
    .filter((task) => task.status === "done" && task.completed_by === userId)
    .reduce((sum, task) => sum + task.points, 0);
}

// Successors carry their place's history; additional newcomers get a baseline so the
// fairness ranking does not hand them every task until they catch up.
export function applyMembershipHistory(
  scores: ScoreRow[],
  tasks: DoneTask[],
  history: MembershipHistory[],
  today: string,
): ScoreRow[] {
  if (history.length === 0) {
    return scores;
  }

  const gardenStart = history.map((member) => member.joined_on).sort()[0];
  const paceOf = (member: MembershipHistory) =>
    donePoints(tasks, member.user_id) / (daysBetween(member.joined_on, member.left_on ?? today) + 1);

  return scores.map((score) => {
    const membership = history.find((member) => member.user_id === score.userId);

    if (!membership) {
      return score;
    }

    const slotMembers = history.filter((member) => member.slot_id === membership.slot_id);
    const newestActive = slotMembers
      .filter((member) => member.is_active)
      .sort((a, b) => b.joined_on.localeCompare(a.joined_on))[0];
    const predecessors = slotMembers.filter((member) => member.user_id !== score.userId && !member.is_active);

    if (predecessors.length > 0) {
      if (newestActive?.user_id !== score.userId) {
        return score;
      }
      const inherited = predecessors.reduce((sum, member) => sum + donePoints(tasks, member.user_id), 0);
      return { ...score, points: score.points + inherited };
    }

    const others = history.filter((member) => member.user_id !== score.userId);
    const averagePace = others.length > 0 ? others.reduce((sum, member) => sum + paceOf(member), 0) / others.length : 0;
    const baseline = Math.round(averagePace * daysBetween(gardenStart, membership.joined_on));
    return baseline > 0 ? { ...score, points: score.points + baseline } : score;
  });
}
