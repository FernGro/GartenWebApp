"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createNotification } from "@/lib/notifications/send";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function lockForecastTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const templateId = readString(formData, "template_id");
  const title = readString(formData, "title");
  const dueDate = readString(formData, "due_date");
  const assignedTo = readString(formData, "assigned_to");
  const points = Number(readString(formData, "points"));

  if (!gardenId || !templateId || !title || !dueDate || !assignedTo || !Number.isInteger(points)) {
    throw new Error("Forecast-Dienst ist ungueltig.");
  }

  const role = await getUserGardenRole(supabase, gardenId, user.id);

  if (assignedTo !== user.id && !canManageGarden(role)) {
    throw new Error("Du kannst nur eigene Forecast-Dienste einloggen. Owner/Admin duerfen alle fixieren.");
  }

  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("garden_id", gardenId)
    .eq("template_id", templateId)
    .eq("due_date", dueDate)
    .neq("status", "cancelled")
    .maybeSingle();

  if (existing) {
    throw new Error("Dieser Forecast-Dienst existiert bereits als Aufgabe.");
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      garden_id: gardenId,
      template_id: templateId,
      title,
      description: "Aus Forecast eingeloggt und fixiert.",
      points,
      due_date: dueDate,
      assigned_to: assignedTo,
      original_assignee: assignedTo,
      status: "assigned",
      created_by: user.id,
      assignment_locked: true,
      locked_by: user.id,
      locked_at: new Date().toISOString(),
    })
    .select("id,garden_id,title")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: task.id,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "assigned",
    to_user_id: assignedTo,
    note: "Forecast-Dienst eingeloggt und fixiert",
  });

  await createNotification(supabase, {
    userId: assignedTo,
    gardenId,
    type: "task_locked_from_forecast",
    title: "Dienst fix eingeloggt",
    message: title,
    relatedTaskId: task.id,
  });

  revalidatePath("/forecast");
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
