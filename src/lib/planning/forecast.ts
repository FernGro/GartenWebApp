import { isTemplateInSeason, suggestAssignee } from "@/lib/planning/fairness";
import type { AvailabilityWindow, ScoreRow, TaskTemplate } from "@/types/domain";

export type ForecastTask = {
  title: string;
  dueDate: string;
  points: number;
  suggestedUserId: string | null;
  suggestedName: string;
  sourceTemplateId: string;
};

function addInterval(date: Date, type: string, interval: number) {
  const next = new Date(date);

  if (type === "weekly") {
    next.setUTCDate(next.getUTCDate() + interval * 7);
  } else {
    next.setUTCMonth(next.getUTCMonth() + interval);
  }

  return next;
}

export function buildThreeMonthForecast(
  templates: TaskTemplate[],
  scores: ScoreRow[],
  availability: AvailabilityWindow[],
  startDate = new Date(),
): ForecastTask[] {
  const horizon = new Date(startDate);
  horizon.setUTCMonth(horizon.getUTCMonth() + 3);
  const rows: ForecastTask[] = [];

  for (const template of templates) {
    if (template.recurrence_type === "none" || template.recurrence_type === "on_demand") {
      continue;
    }

    let cursor = addInterval(new Date(startDate), template.recurrence_type, template.recurrence_interval);

    while (cursor <= horizon) {
      const month = cursor.getUTCMonth() + 1;

      if (isTemplateInSeason(month, template.season_start_month, template.season_end_month)) {
        const dueDate = cursor.toISOString().slice(0, 10);
        const suggestion = suggestAssignee(scores, dueDate, availability);
        rows.push({
          title: template.title,
          dueDate,
          points: template.default_points,
          suggestedUserId: suggestion?.userId ?? null,
          suggestedName: suggestion?.displayName ?? "Niemand verfuegbar",
          sourceTemplateId: template.id,
        });
      }

      cursor = addInterval(cursor, template.recurrence_type, template.recurrence_interval);
    }
  }

  return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
}
