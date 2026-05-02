"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { assertCleanText } from "@/lib/moderation/content";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function addTaskCommentAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const comment = readString(formData, "comment");

  if (!taskId || !gardenId || !comment) {
    throw new Error("Kommentar darf nicht leer sein.");
  }

  assertCleanText(comment, "Kommentar");

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    garden_id: gardenId,
    user_id: user.id,
    comment,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "commented",
    note: "Kommentar hinzugefuegt",
  });

  revalidatePath(`/tasks/${taskId}`);
}
