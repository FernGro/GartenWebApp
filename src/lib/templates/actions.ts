"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getAvailability } from "@/lib/availability/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { addDays, getCadenceRule, isTemplateDateInSeason } from "@/lib/planning/cadence";
import { suggestAssignee } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTaskTemplates, getTasks } from "@/lib/tasks/queries";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function readNumber(formData: FormData, key: string) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : null;
}

async function assertCanManage(gardenId: string, userId: string) {
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const role = await getUserGardenRole(supabase, gardenId, userId);

  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen Vorlagen verwalten.");
  }
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
  const existingKeys = new Set(tasks.map((task) => `${task.template_id ?? task.title}:${task.due_date ?? ""}`));
  const rows = templates
    .filter((template) => template.recurrence_type !== "none" && template.recurrence_type !== "on_demand")
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
    .filter((row) => {
      const template = templates.find((entry) => entry.id === row.template_id);
      return template ? isTemplateDateInSeason(row.due_date, template) : true;
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

export async function createTaskTemplateAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const title = readString(formData, "title");
  const defaultPoints = readNumber(formData, "default_points");
  const estimatedMinutes = readNumber(formData, "estimated_minutes");
  const customIntervalDays = readNumber(formData, "custom_interval_days");
  const seasonStartMonth = readNumber(formData, "season_start_month");
  const seasonStartDay = readNumber(formData, "season_start_day");
  const seasonEndMonth = readNumber(formData, "season_end_month");
  const seasonEndDay = readNumber(formData, "season_end_day");
  const isWeatherDependent = formData.get("is_weather_dependent") === "on";

  if (
    !gardenId ||
    !title ||
    !defaultPoints ||
    !estimatedMinutes ||
    !customIntervalDays ||
    !seasonStartMonth ||
    !seasonStartDay ||
    !seasonEndMonth ||
    !seasonEndDay
  ) {
    throw new Error("Vorlage ist unvollstaendig.");
  }

  await assertCanManage(gardenId, user.id);

  const { error } = await supabase.from("task_templates").insert({
    garden_id: gardenId,
    title,
    default_points: defaultPoints,
    estimated_minutes: estimatedMinutes,
    season_start_month: seasonStartMonth,
    season_start_day: seasonStartDay,
    season_end_month: seasonEndMonth,
    season_end_day: seasonEndDay,
    recurrence_type: "seasonal",
    recurrence_interval: 1,
    custom_interval_days: customIntervalDays,
    is_weather_dependent: isWeatherDependent,
    is_active: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/templates");
  revalidatePath("/forecast");
  revalidatePath("/calendar");
}

export async function updateTaskTemplateScheduleAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const templateId = readString(formData, "template_id");
  const customIntervalDays = readNumber(formData, "custom_interval_days");
  const seasonStartMonth = readNumber(formData, "season_start_month");
  const seasonStartDay = readNumber(formData, "season_start_day");
  const seasonEndMonth = readNumber(formData, "season_end_month");
  const seasonEndDay = readNumber(formData, "season_end_day");
  const isActive = formData.get("is_active") === "on";

  if (!gardenId || !templateId || !customIntervalDays || !seasonStartMonth || !seasonStartDay || !seasonEndMonth || !seasonEndDay) {
    throw new Error("Vorlagen-Zeitplan ist unvollstaendig.");
  }

  await assertCanManage(gardenId, user.id);

  const { error } = await supabase
    .from("task_templates")
    .update({
      custom_interval_days: customIntervalDays,
      season_start_month: seasonStartMonth,
      season_start_day: seasonStartDay,
      season_end_month: seasonEndMonth,
      season_end_day: seasonEndDay,
      is_active: isActive,
    })
    .eq("id", templateId)
    .eq("garden_id", gardenId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/templates");
  revalidatePath("/forecast");
  revalidatePath("/calendar");
}
