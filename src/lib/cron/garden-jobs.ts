import type { SupabaseClient } from "@supabase/supabase-js";
import { diffDays, getCadenceRule, isTemplateDateInSeason } from "@/lib/planning/cadence";
import { suggestAssignee } from "@/lib/planning/fairness";
import { calculateScores, getTaskTemplates, getTasks } from "@/lib/tasks/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { getAvailability } from "@/lib/availability/queries";
import { createNotification } from "@/lib/notifications/send";
import { hasCronMessageForTask, hasTakeoverCallForTask, insertSystemChatMessage } from "@/lib/chat/queries";
import type { Database } from "@/types/database";
import type { AvailabilityWindow, GardenMember, ScoreRow, TaskWithPeople } from "@/types/domain";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function daysDiff(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

function mentionName(name: string) {
  return `@${name.trim().replace(/\s+/g, "_")}`;
}

function isUnavailable(userId: string, dueDate: string | null, availability: AvailabilityWindow[]) {
  if (!dueDate) return false;
  return availability.some((entry) => entry.user_id === userId && entry.from_date <= dueDate && entry.to_date >= dueDate);
}

function rankedTakeoverCandidates(
  scores: ScoreRow[],
  currentAssignee: string | null,
  dueDate: string | null,
  availability: AvailabilityWindow[],
) {
  return [...scores]
    .filter((score) => score.userId !== currentAssignee)
    .filter((score) => !isUnavailable(score.userId, dueDate, availability))
    .sort((a, b) => {
      if (a.points !== b.points) return a.points - b.points;
      if (!a.lastCompletedAt && b.lastCompletedAt) return -1;
      if (a.lastCompletedAt && !b.lastCompletedAt) return 1;
      return (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? "");
    });
}

async function postTakeoverCall(params: {
  supabase: SupabaseClient<Database>;
  gardenId: string;
  task: TaskWithPeople;
  members: GardenMember[];
  scores: ScoreRow[];
  availability: AvailabilityWindow[];
  today: string;
  reason: "overdue" | "postponed";
}) {
  const { supabase, gardenId, task, members, scores, availability, today, reason } = params;
  const alreadyPosted = await hasTakeoverCallForTask(supabase, gardenId, task.id);
  if (alreadyPosted) return false;

  const candidates = rankedTakeoverCandidates(scores, task.assigned_to, task.due_date, availability);
  const currentName = members.find((m) => m.user_id === task.assigned_to)?.profiles?.display_name ?? "Unbekannt";
  const candidateList = candidates.length > 0
    ? candidates.map((s, index) => `${index + 1}. ${s.displayName}: ${s.points} Pkt.`).join("\n")
    : "Keine passende Vertretung gefunden.";
  const topCandidate = candidates[0] ?? null;
  const daysLate = task.due_date ? daysDiff(task.due_date, today) : 0;
  const intro = reason === "postponed"
    ? `⚠️ "${task.title}" wurde von ${currentName} abgegeben.`
    : `⚠️ "${task.title}" ist seit ${daysLate} Tagen überfällig und noch nicht erledigt markiert.`;
  const topLine = topCandidate
    ? `${mentionName(topCandidate.displayName)} ist nach Score aktuell der sinnvollste Vorschlag.`
    : "Bitte klaert im Chat, wer den Dienst uebernimmt.";

  await insertSystemChatMessage(supabase, {
    gardenId,
    content: [
      intro,
      `Bisher zugewiesen: ${currentName}`,
      "",
      "Vorschlag nach Score:",
      candidateList,
      "",
      topLine,
      "Jede Person kann die Aufgabe ueber den Uebernahme-Button akzeptieren.",
    ].join("\n"),
    messageType: "system_overdue",
    visibleToUserId: null,
    relatedTaskId: task.id,
    mentionedUserIds: topCandidate ? [topCandidate.userId] : [],
  });

  for (const member of members.filter((m) => m.user_id !== task.assigned_to)) {
    await createNotification(supabase, {
      userId: member.user_id,
      gardenId,
      type: reason === "postponed" ? "task_takeover_needed" : "task_overdue_takeover_needed",
      title: "Dienst sucht Uebernahme",
      message: task.title,
      relatedTaskId: task.id,
    });
  }

  return true;
}

export async function runGardenAutomation(supabase: SupabaseClient<Database>) {
  const { data: gardens, error } = await supabase
    .from("gardens")
    .select("id,chat_retention_days");

  if (error) {
    throw new Error(error.message);
  }

  let createdTasks = 0;
  let createdNotifications = 0;
  const today = new Date().toISOString().slice(0, 10);
  const soon = addDays(new Date(), 7);
  const since20h = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString();

  for (const garden of gardens ?? []) {
    const [templates, tasks, members, availability] = await Promise.all([
      getTaskTemplates(supabase, garden.id),
      getTasks(supabase, garden.id),
      getGardenMembers(supabase, garden.id),
      getAvailability(supabase, garden.id),
    ]);
    const scores = calculateScores(tasks, members);
    const templateRows = templates
      .filter((template) => template.recurrence_type !== "none" && template.recurrence_type !== "on_demand")
      .map((template) => {
        const cadence = getCadenceRule(template);
        const dueDate = addDays(new Date(), cadence.intervalDays);
        const assignee = suggestAssignee(scores, dueDate, availability);

        return {
          garden_id: garden.id,
          template_id: template.id,
          title: template.title,
          description: `Automatisch aus Vorlage erzeugt (${template.recurrence_type}).`,
          points: template.default_points,
          due_date: dueDate,
          assigned_to: assignee?.userId ?? null,
          original_assignee: assignee?.userId ?? null,
          status: assignee ? "assigned" as const : "open" as const,
          created_by: null,
        };
      })
      .filter((row) => {
        const template = templates.find((entry) => entry.id === row.template_id);
        return template ? isTemplateDateInSeason(row.due_date, template) : true;
      })
      .filter((row) => {
        // Skip if an active task for this template already exists within minGapDays.
        // Point-exact date matching caused daily duplicates (due_date shifts by 1 each cron run).
        const template = templates.find((t) => t.id === row.template_id);
        const { minGapDays } = template ? getCadenceRule(template) : { minGapDays: 1 };
        return !tasks.some(
          (t) =>
            t.template_id === row.template_id &&
            t.status !== "done" &&
            t.status !== "cancelled" &&
            t.due_date !== null &&
            Math.abs(diffDays(t.due_date, row.due_date)) < minGapDays,
        );
      });

    if (templateRows.length > 0) {
      const { data: insertedTasks, error: taskError } = await supabase
        .from("tasks")
        .insert(templateRows)
        .select("id,garden_id,title,assigned_to");

      if (taskError) {
        throw new Error(taskError.message);
      }

      createdTasks += insertedTasks?.length ?? 0;
      const assignedNotifications = (insertedTasks ?? [])
        .filter((task) => task.assigned_to)
        .map((task) => ({
          user_id: task.assigned_to as string,
          garden_id: task.garden_id,
          type: "task_assigned",
          title: "Neue Aufgabe aus Vorlage",
          message: task.title,
          related_task_id: task.id,
        }));

      for (const notification of assignedNotifications) {
        await createNotification(supabase, {
          userId: notification.user_id,
          gardenId: notification.garden_id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          relatedTaskId: notification.related_task_id,
        });
        createdNotifications += 1;
      }
    }

    const activeTasks = tasks.filter((task) =>
      task.assigned_to && ["open", "assigned", "overdue", "postponed"].includes(task.status),
    );
    const overdue = activeTasks.filter((task) => task.due_date && task.due_date < today);
    const newlyOverdue = overdue.filter((task) => task.status === "open" || task.status === "assigned");
    const dueSoon = activeTasks.filter((task) => task.status !== "postponed" && task.due_date && task.due_date >= today && task.due_date <= soon);

    if (newlyOverdue.length > 0) {
      await supabase.from("tasks").update({ status: "overdue" }).in("id", newlyOverdue.map((task) => task.id));
    }

    const reminderRows = [
      ...overdue.map((task) => ({
        user_id: task.assigned_to as string,
        garden_id: garden.id,
        type: "task_overdue",
        title: "Aufgabe ueberfaellig",
        message: task.title,
        related_task_id: task.id,
      })),
      ...dueSoon.map((task) => ({
        user_id: task.assigned_to as string,
        garden_id: garden.id,
        type: "task_due_soon",
        title: "Diese Woche im Garten dran",
        message: task.title,
        related_task_id: task.id,
      })),
    ];

    for (const notification of reminderRows) {
      await createNotification(supabase, {
        userId: notification.user_id,
        gardenId: notification.garden_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        relatedTaskId: notification.related_task_id,
      });
      createdNotifications += 1;
    }

    // --- Chat-Erinnerungen mit @Mention an die zugewiesene Person ---
    const reminderTriggerDays = [7, 3, 0];
    for (const task of activeTasks) {
      if (!task.due_date || !task.assigned_to || task.status === "postponed") continue;
      const daysLeft = daysDiff(today, task.due_date);
      if (!reminderTriggerDays.includes(daysLeft)) continue;

      const alreadyPosted = await hasCronMessageForTask(
        supabase, garden.id, task.id, "system_reminder", since20h,
      );
      if (alreadyPosted) continue;

      const assigneeName = members.find((m) => m.user_id === task.assigned_to)?.profiles?.display_name ?? "du";
      const assigneeMention = mentionName(assigneeName);
      const content = daysLeft === 0
        ? `⏰ ${assigneeMention} heute fällig: ${task.title}`
        : `⏰ ${assigneeMention} in ${daysLeft} Tagen fällig: ${task.title}`;

      await insertSystemChatMessage(supabase, {
        gardenId: garden.id,
        content,
        messageType: "system_reminder",
        visibleToUserId: null,
        relatedTaskId: task.id,
        mentionedUserIds: [task.assigned_to as string],
      });

      await createNotification(supabase, {
        userId: task.assigned_to as string,
        gardenId: garden.id,
        type: "chat_task_reminder",
        title: daysLeft === 0 ? "Dienst heute faellig" : `Dienst in ${daysLeft} Tagen`,
        message: task.title,
        relatedTaskId: task.id,
      });
      createdNotifications += 1;
    }

    // --- Öffentliche Übernahme-Aufrufe (ab 5 Tagen überfällig oder direkt bei "verschoben") ---
    for (const task of activeTasks) {
      const isPostponed = task.status === "postponed";
      if (!isPostponed && !task.due_date) continue;
      const daysLate = task.due_date ? daysDiff(task.due_date, today) : 0;
      if (!isPostponed && daysLate < 5) continue;

      const posted = await postTakeoverCall({
        supabase,
        gardenId: garden.id,
        task,
        members,
        scores,
        availability,
        today,
        reason: isPostponed ? "postponed" : "overdue",
      });
      if (posted) {
        createdNotifications += Math.max(0, members.filter((m) => m.user_id !== task.assigned_to).length);
      }
    }

    // --- Retention-Cleanup ---
    if (garden.chat_retention_days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - garden.chat_retention_days);
      const { error: cleanupError } = await supabase
        .from("garden_chat_messages")
        .delete()
        .eq("garden_id", garden.id)
        .lt("created_at", cutoff.toISOString());

      if (cleanupError) {
        console.error("chat retention cleanup", cleanupError.message);
      }
    }
  }

  return { gardens: gardens?.length ?? 0, createdTasks, createdNotifications };
}
