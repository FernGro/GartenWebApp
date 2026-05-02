"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createNotification } from "@/lib/notifications/send";
import { createClient } from "@/lib/supabase/server";
import { getTasks } from "@/lib/tasks/queries";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export async function createDueNotificationsAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");

  if (!gardenId) {
    throw new Error("Garten fehlt.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const soon = addDays(new Date(), 7);
  const tasks = await getTasks(supabase, gardenId);
  const openTasks = tasks.filter((task) => task.assigned_to && (task.status === "open" || task.status === "assigned"));

  const overdue = openTasks.filter((task) => task.due_date && task.due_date < today);
  const dueSoon = openTasks.filter((task) => task.due_date && task.due_date >= today && task.due_date <= soon);

  if (overdue.length > 0) {
    await supabase.from("tasks").update({ status: "overdue" }).in("id", overdue.map((task) => task.id));
  }

  const rows = [
    ...overdue.map((task) => ({
      userId: task.assigned_to as string,
      gardenId,
      type: "task_overdue",
      title: "Aufgabe ueberfaellig",
      message: task.title,
      relatedTaskId: task.id,
    })),
    ...dueSoon.map((task) => ({
      userId: task.assigned_to as string,
      gardenId,
      type: "task_due_soon",
      title: "Diese Woche im Garten dran",
      message: task.title,
      relatedTaskId: task.id,
    })),
  ];

  for (const row of rows) {
    await createNotification(supabase, row);
  }

  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
}
