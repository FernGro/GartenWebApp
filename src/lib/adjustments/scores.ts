import type { MemberAdjustment, ScoreRow } from "@/types/domain";

export function applyPointAdjustments(scores: ScoreRow[], adjustments: MemberAdjustment[]) {
  return scores
    .map((score) => ({
      ...score,
      points: score.points + adjustments
        .filter((adjustment) => adjustment.user_id === score.userId)
        .reduce((sum, adjustment) => sum + adjustment.points_delta, 0),
    }))
    .sort((a, b) => a.points - b.points || (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? ""));
}
