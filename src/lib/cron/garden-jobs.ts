import type { SupabaseClient } from "@supabase/supabase-js";
import { isTemplateInSeason, suggestAssignee } from "@/lib/planning/fairness";
import { calculateScores, getTaskTemplates, getTasks } from "@/lib/tasks/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { getAvailability } from "@/lib/availability/queries";
import { createNotification } from "@/lib/notifications/send";
import type { Database } from "@/types/database";
import type { RecurrenceType } from "@/types/domain";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function addInterval(date: Date, recurrenceType: RecurrenceType, interval: number) {
  const next = new Date(date);

  if (recurrenceType === "weekly") {
    next.setDate(next.getDate() + interval * 7);
  } else if (recurrenceType === "monthly" || recurrenceType === "seasonal") {
    next.setMonth(next.getMonth() + interval);
  } else {
    next.setDate(next.getDate() + 14);
  }

  return next.toISOString().slice(0, 10);
}

export async function runGardenAutomation(supabase: SupabaseClient<Database>) {
  const { data: gardens, error } = await supabase.from("gardens").select("id");

  if (error) {
    throw new Error(error.message);
  }

  let createdTasks = 0;
  let createdNotifications = 0;
  const today = new Date().toISOString().slice(0, 10);
  const soon = addDays(new Date(), 3);
  const month = new Date().getMonth() + 1;

  for (const garden of gardens ?? []) {
    const [templates, tasks, members, availability] = await Promise.all([
      getTaskTemplates(supabase, garden.id),
      getTasks(supabase, garden.id),
      getGardenMembers(supabase, garden.id),
      getAvailability(supabase, garden.id),
    ]);
    const scores = calculateScores(tasks, members);
    const existingKeys = new Set(tasks.map((task) => `${task.template_id ?? task.title}:${task.due_date ?? ""}`));
    const templateRows = templates
      .filter((template) => template.recurrence_type !== "none" && template.recurrence_type !== "on_demand")
      .filter((template) => isTemplateInSeason(month, template.season_start_month, template.season_end_month))
      .map((template) => {
        const dueDate = addInterval(new Date(), template.recurrence_type, template.recurrence_interval);
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
      .filter((row) => !existingKeys.has(`${row.template_id}:${row.due_date}`));

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

    const activeTasks = tasks.filter((task) => task.assigned_to && (task.status === "open" || task.status === "assigned"));
    const overdue = activeTasks.filter((task) => task.due_date && task.due_date < today);
    const dueSoon = activeTasks.filter((task) => task.due_date && task.due_date >= today && task.due_date <= soon);

    if (overdue.length > 0) {
      await supabase.from("tasks").update({ status: "overdue" }).in("id", overdue.map((task) => task.id));
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
        title: "Aufgabe bald faellig",
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
  }

  return { gardens: gardens?.length ?? 0, createdTasks, createdNotifications };
}
