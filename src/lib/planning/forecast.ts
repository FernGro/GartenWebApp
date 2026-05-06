import { isTemplateInSeason, suggestAssignee } from "@/lib/planning/fairness";
import { addDays, diffDays, getCadenceRule, getTaskCategory, type TaskCategory } from "@/lib/planning/cadence";
import type { AvailabilityWindow, ScoreRow, TaskTemplate, TaskWithPeople } from "@/types/domain";

export type ForecastTask = {
  kind: "actual" | "suggestion";
  taskId: string | null;
  title: string;
  dueDate: string;
  points: number;
  suggestedUserId: string | null;
  suggestedName: string;
  sourceTemplateId: string | null;
  category: TaskCategory;
  cadenceLabel: string;
  reason: string;
  assignmentLocked: boolean;
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

function latestCategoryDate(category: TaskCategory, tasks: TaskWithPeople[]) {
  return tasks
    .filter((task) => task.due_date && task.status !== "cancelled" && getTaskCategory(task.title) === category)
    .map((task) => task.due_date as string)
    .sort()
    .at(-1) ?? null;
}

function planningKey(title: string, category: TaskCategory) {
  if (category !== "other") {
    return category;
  }

  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function dateInRange(date: string | null, startDate: Date, horizon: Date) {
  if (!date) {
    return false;
  }

  const current = new Date(`${date}T00:00:00.000Z`);
  return current >= startDate && current <= horizon;
}

function latestDateBefore(dates: string[], dueDate: string) {
  return dates
    .filter((date) => date < dueDate)
    .sort()
    .at(-1) ?? null;
}

function hasNearbyDate(dates: string[], dueDate: string, minGapDays: number) {
  return dates.some((date) => Math.abs(diffDays(date, dueDate)) < minGapDays);
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
  const start = new Date(startDate);
  const candidates: ForecastTask[] = [];
  const realTasks: ForecastTask[] = tasks
    .filter((task) => task.status !== "cancelled" && dateInRange(task.due_date, start, horizon))
    .map((task) => ({
      kind: "actual",
      taskId: task.id,
      title: task.title,
      dueDate: task.due_date as string,
      points: task.points,
      suggestedUserId: task.assigned_to,
      suggestedName: task.assigned_profile?.display_name ?? "Nicht zugewiesen",
      sourceTemplateId: task.template_id,
      category: getTaskCategory(task.title),
      cadenceLabel: task.assignment_locked ? "fixierter Termin" : "echte Aufgabe",
      reason: task.assignment_locked ? "Eingeloggt/fixiert und bleibt bei Neuplanung erhalten" : "Bereits als Aufgabe im Kalender",
      assignmentLocked: task.assignment_locked,
    }));
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
    const key = planningKey(template.title, cadence.category);
    const existingDates = tasks
      .filter((task) => task.due_date && task.status !== "cancelled" && planningKey(task.title, getTaskCategory(task.title)) === key)
      .map((task) => task.due_date as string);
    const lastDate = latestDateBefore(existingDates, start.toISOString().slice(0, 10))
      ?? latestTemplateDate(template, tasks)
      ?? (cadence.category === "other" ? null : latestCategoryDate(cadence.category, tasks));
    let cursor = lastDate
      ? addDays(new Date(`${lastDate}T00:00:00.000Z`), cadence.intervalDays)
      : addDays(new Date(startDate), Math.min(cadence.intervalDays, 21));

    while (cursor <= horizon) {
      const month = cursor.getUTCMonth() + 1;

      if (isTemplateInSeason(month, template.season_start_month, template.season_end_month)) {
        const dueDate = cursor.toISOString().slice(0, 10);
        const plannedDates = candidates
          .filter((candidate) => planningKey(candidate.title, candidate.category) === key)
          .map((candidate) => candidate.dueDate)
          .sort();
        const previous = latestDateBefore([...existingDates, ...plannedDates], dueDate);

        if (!previous || diffDays(previous, dueDate) >= cadence.minGapDays) {
          const duplicateNearby = hasNearbyDate([...existingDates, ...plannedDates], dueDate, cadence.minGapDays);

          if (!duplicateNearby) {
            candidates.push({
              kind: "suggestion",
              taskId: null,
              title: template.title,
              dueDate,
              points: template.default_points,
              suggestedUserId: null,
              suggestedName: "Noch nicht berechnet",
              sourceTemplateId: template.id,
              category: cadence.category,
              cadenceLabel: cadence.label,
              reason: previous
                ? `${diffDays(previous, dueDate)} Tage Abstand zum letzten Dienst dieser Art`
                : "Erster sinnvoller Termin im Forecast",
              assignmentLocked: false,
            });
          }
        }
      }

      cursor = addDays(cursor, cadence.intervalDays);
    }
  }

  return [...realTasks, ...candidates]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))
    .map((candidate) => {
      if (candidate.kind === "actual") {
        if (candidate.suggestedUserId) {
          const score = simulatedScores.find((row) => row.userId === candidate.suggestedUserId);
          if (score) {
            score.plannedPoints += candidate.points;
            score.plannedCount += 1;
            score.lastPlannedAt = candidate.dueDate;
            score.lastPlannedTitle = candidate.title;
          }
        }

        return candidate;
      }

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
