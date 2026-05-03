import { isTemplateInSeason, suggestAssignee } from "@/lib/planning/fairness";
import { addDays, diffDays, getCadenceRule } from "@/lib/planning/cadence";
import type { AvailabilityWindow, ScoreRow, TaskTemplate, TaskWithPeople } from "@/types/domain";

export type ForecastTask = {
  title: string;
  dueDate: string;
  points: number;
  suggestedUserId: string | null;
  suggestedName: string;
  sourceTemplateId: string;
  cadenceLabel: string;
  reason: string;
};

type PlannedScore = ScoreRow & {
  plannedPoints: number;
  plannedCount: number;
  lastPlannedAt: string | null;
  lastPlannedTitle: string | null;
};

function latestTemplateDate(template: TaskTemplate, tasks: TaskWithPeople[]) {
  return tasks
    .filter((task) => task.template_id === template.id && task.due_date && task.status !== "cancelled")
    .map((task) => task.due_date as string)
    .sort()
    .at(-1) ?? null;
}

function latestSimilarDate(title: string, tasks: TaskWithPeople[]) {
  const normalized = title.toLowerCase();
  return tasks
    .filter((task) => task.due_date && task.status !== "cancelled" && task.title.toLowerCase() === normalized)
    .map((task) => task.due_date as string)
    .sort()
    .at(-1) ?? null;
}

function scoreForForecast(
  scores: PlannedScore[],
  dueDate: string,
  title: string,
  points: number,
  availability: AvailabilityWindow[],
) {
  const available = scores.filter((score) => {
    const unavailable = availability.some(
      (entry) => entry.user_id === score.userId && entry.from_date <= dueDate && entry.to_date >= dueDate,
    );
    return !unavailable;
  });

  const pool = available.length > 1
    ? available.filter((score) => !(score.lastPlannedAt === dueDate || score.lastPlannedTitle === title))
    : available;
  const suggestion = [...(pool.length ? pool : available)].sort((a, b) => {
    const aLoad = a.points + a.plannedPoints;
    const bLoad = b.points + b.plannedPoints;

    if (aLoad !== bLoad) {
      return aLoad - bLoad;
    }

    if (a.plannedCount !== b.plannedCount) {
      return a.plannedCount - b.plannedCount;
    }

    const aLast = a.lastPlannedAt ?? a.lastCompletedAt ?? "";
    const bLast = b.lastPlannedAt ?? b.lastCompletedAt ?? "";

    if (!aLast && bLast) {
      return -1;
    }

    if (aLast && !bLast) {
      return 1;
    }

    return aLast.localeCompare(bLast);
  })[0] ?? null;

  if (suggestion) {
    suggestion.plannedPoints += points;
    suggestion.plannedCount += 1;
    suggestion.lastPlannedAt = dueDate;
    suggestion.lastPlannedTitle = title;
  }

  return suggestion;
}

export function buildThreeMonthForecast(
  templates: TaskTemplate[],
  scores: ScoreRow[],
  availability: AvailabilityWindow[],
  tasks: TaskWithPeople[] = [],
  startDate = new Date(),
): ForecastTask[] {
  const horizon = new Date(startDate);
  horizon.setUTCMonth(horizon.getUTCMonth() + 3);
  const candidates: ForecastTask[] = [];
  const simulatedScores: PlannedScore[] = scores.map((score) => ({
    ...score,
    plannedPoints: 0,
    plannedCount: 0,
    lastPlannedAt: null,
    lastPlannedTitle: null,
  }));

  for (const template of templates) {
    if (template.recurrence_type === "none" || template.recurrence_type === "on_demand") {
      continue;
    }

    const cadence = getCadenceRule(template);
    const lastDate = latestTemplateDate(template, tasks) ?? latestSimilarDate(template.title, tasks);
    let cursor = lastDate
      ? addDays(new Date(`${lastDate}T00:00:00.000Z`), cadence.intervalDays)
      : addDays(new Date(startDate), Math.min(cadence.intervalDays, 21));

    while (cursor <= horizon) {
      const month = cursor.getUTCMonth() + 1;

      if (isTemplateInSeason(month, template.season_start_month, template.season_end_month)) {
        const dueDate = cursor.toISOString().slice(0, 10);
        const previous = [...candidates]
          .filter((candidate) => candidate.sourceTemplateId === template.id || candidate.title === template.title)
          .map((candidate) => candidate.dueDate)
          .sort()
          .at(-1) ?? lastDate;

        if (!previous || diffDays(previous, dueDate) >= cadence.minGapDays) {
          candidates.push({
            title: template.title,
            dueDate,
            points: template.default_points,
            suggestedUserId: null,
            suggestedName: "Noch nicht berechnet",
            sourceTemplateId: template.id,
            cadenceLabel: cadence.label,
            reason: previous
              ? `${diffDays(previous, dueDate)} Tage Abstand zum letzten gleichen Dienst`
              : "Erster sinnvoller Termin im Forecast",
          });
        }
      }

      cursor = addDays(cursor, cadence.intervalDays);
    }
  }

  return candidates
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))
    .map((candidate) => {
      const suggestion = scoreForForecast(
        simulatedScores,
        candidate.dueDate,
        candidate.title,
        candidate.points,
        availability,
      ) ?? suggestAssignee(simulatedScores, candidate.dueDate, availability);

      return {
        ...candidate,
        suggestedUserId: suggestion?.userId ?? null,
        suggestedName: suggestion?.displayName ?? "Niemand verfuegbar",
      };
    });
}
