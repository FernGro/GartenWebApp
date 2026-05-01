"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAvailability } from "@/lib/availability/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { suggestAssignee } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTasks } from "@/lib/tasks/queries";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const title = readString(formData, "title");
  const description = readString(formData, "description") || null;
  const dueDate = readString(formData, "due_date") || null;
  let assignedTo = readString(formData, "assigned_to") || null;
  const points = Number(readString(formData, "points"));

  if (!gardenId || !title || !Number.isInteger(points) || points < 1 || points > 5) {
    throw new Error("Bitte Titel, Garten und Punkte korrekt ausfuellen.");
  }

  if (!assignedTo) {
    const [members, tasks, availability] = await Promise.all([
      getGardenMembers(supabase, gardenId),
      getTasks(supabase, gardenId),
      getAvailability(supabase, gardenId),
    ]);
    const suggestion = suggestAssignee(calculateScores(tasks, members), dueDate, availability);
    assignedTo = suggestion?.userId ?? null;
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      garden_id: gardenId,
      title,
      description,
      due_date: dueDate,
      points,
      assigned_to: assignedTo,
      original_assignee: assignedTo,
      status: assignedTo ? "assigned" : "open",
      created_by: user.id,
    })
    .select("id,garden_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: task.id,
    garden_id: task.garden_id,
    actor_id: user.id,
    event_type: assignedTo ? "assigned" : "created",
    to_user_id: assignedTo,
    note: "Aufgabe erstellt",
  });

  if (assignedTo) {
    await supabase.from("notifications").insert({
      user_id: assignedTo,
      garden_id: gardenId,
      type: "task_assigned",
      title: "Neue Aufgabe",
      message: title,
      related_task_id: task.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect(`/tasks/${task.id}`);
}

export async function completeTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const points = Number(readString(formData, "points"));

  if (!taskId || !gardenId) {
    throw new Error("Aufgabe konnte nicht gefunden werden.");
  }

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "done",
      completed_by: user.id,
      completed_at: completedAt,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "completed",
    to_user_id: user.id,
    points_delta: Number.isFinite(points) ? points : null,
    note: "Aufgabe erledigt",
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}
