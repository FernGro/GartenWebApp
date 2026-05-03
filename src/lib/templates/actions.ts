"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getAvailability } from "@/lib/availability/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { addDays, getCadenceRule } from "@/lib/planning/cadence";
import { isTemplateInSeason, suggestAssignee } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTaskTemplates, getTasks } from "@/lib/tasks/queries";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function generateSeasonalTasksAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");

  if (!gardenId) {
    throw new Error("Garten fehlt.");
  }

  const [templates, tasks, members, availability] = await Promise.all([
    getTaskTemplates(supabase, gardenId),
    getTasks(supabase, gardenId),
    getGardenMembers(supabase, gardenId),
    getAvailability(supabase, gardenId),
  ]);
  const scores = calculateScores(tasks, members);
  const now = new Date();
  const month = now.getMonth() + 1;
  const existingKeys = new Set(tasks.map((task) => `${task.template_id ?? task.title}:${task.due_date ?? ""}`));
  const rows = templates
    .filter((template) => template.recurrence_type !== "none" && template.recurrence_type !== "on_demand")
    .filter((template) => isTemplateInSeason(month, template.season_start_month, template.season_end_month))
    .map((template) => {
      const cadence = getCadenceRule(template);
      const dueDate = toIsoDate(addDays(now, cadence.intervalDays));
      const assignee = suggestAssignee(scores, dueDate, availability);

      return {
        garden_id: gardenId,
        template_id: template.id,
        title: template.title,
        description: `Automatisch aus Vorlage erzeugt (${template.recurrence_type}).`,
        points: template.default_points,
        due_date: dueDate,
        assigned_to: assignee?.userId ?? null,
        original_assignee: assignee?.userId ?? null,
        status: assignee ? "assigned" as const : "open" as const,
        created_by: user.id,
      };
    })
    .filter((row) => !existingKeys.has(`${row.template_id}:${row.due_date}`));

  if (rows.length === 0) {
    revalidatePath("/templates");
    return;
  }

  const { data, error } = await supabase.from("tasks").insert(rows).select("id,garden_id,title,assigned_to");

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert(
    (data ?? []).map((task) => ({
      task_id: task.id,
      garden_id: task.garden_id,
      actor_id: user.id,
      event_type: "created" as const,
      to_user_id: task.assigned_to,
      note: "Aus Vorlage erzeugt",
    })),
  );

  const notificationRows = (data ?? [])
    .filter((task) => task.assigned_to)
    .map((task) => ({
      user_id: task.assigned_to as string,
      garden_id: task.garden_id,
      type: "task_assigned",
      title: "Neue Aufgabe aus Vorlage",
      message: task.title,
      related_task_id: task.id,
    }));

  if (notificationRows.length > 0) {
    await supabase.from("notifications").insert(notificationRows);
  }

  revalidatePath("/templates");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
