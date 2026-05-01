import type { AvailabilityWindow, ScoreRow } from "@/types/domain";

function isUnavailable(userId: string, dueDate: string | null, availability: AvailabilityWindow[]) {
  if (!dueDate) {
    return false;
  }

  return availability.some(
    (entry) => entry.user_id === userId && entry.from_date <= dueDate && entry.to_date >= dueDate,
  );
}

export function suggestAssignee(
  scores: ScoreRow[],
  dueDate: string | null,
  availability: AvailabilityWindow[] = [],
) {
  return [...scores]
    .filter((score) => !isUnavailable(score.userId, dueDate, availability))
    .sort((a, b) => {
      if (a.points !== b.points) {
        return a.points - b.points;
      }

      if (!a.lastCompletedAt && b.lastCompletedAt) {
        return -1;
      }

      if (a.lastCompletedAt && !b.lastCompletedAt) {
        return 1;
      }

      return (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? "");
    })[0] ?? null;
}

export function isTemplateInSeason(month: number, startMonth: number, endMonth: number) {
  if (startMonth <= endMonth) {
    return month >= startMonth && month <= endMonth;
  }

  return month >= startMonth || month <= endMonth;
}
