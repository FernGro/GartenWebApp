import type { SupabaseClient } from "@supabase/supabase-js";
import { getMemberAdjustments } from "@/lib/adjustments/queries";
import { applyPointAdjustments } from "@/lib/adjustments/scores";
import { getGardenMembers } from "@/lib/gardens/queries";
import { calculateScores } from "@/lib/tasks/queries";
import type { Database } from "@/types/database";
import type { GardenMember, ScoreRow, Task } from "@/types/domain";

// Points used to decide who gets the next task: own work, predecessor history and manual corrections.
export async function getRankingScores(
  supabase: SupabaseClient<Database>,
  gardenId: string,
  tasks: Task[],
  members: Pick<GardenMember, "user_id" | "profiles">[],
): Promise<ScoreRow[]> {
  const [history, adjustments] = await Promise.all([
    getGardenMembers(supabase, gardenId, true),
    getMemberAdjustments(supabase, gardenId),
  ]);
  return applyPointAdjustments(calculateScores(tasks, members, history), adjustments);
}
