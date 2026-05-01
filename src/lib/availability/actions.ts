"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createAvailabilityAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const fromDate = readString(formData, "from_date");
  const toDate = readString(formData, "to_date");
  const reason = readString(formData, "reason") || null;

  if (!gardenId || !fromDate || !toDate || fromDate > toDate) {
    throw new Error("Bitte gueltige Abwesenheitsdaten eintragen.");
  }

  const { error } = await supabase.from("availability").insert({
    garden_id: gardenId,
    user_id: user.id,
    from_date: fromDate,
    to_date: toDate,
    reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/garden");
  revalidatePath("/tasks/new");
}

export async function deleteAvailabilityAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const id = readString(formData, "id");

  if (!id) {
    throw new Error("Abwesenheit fehlt.");
  }

  const { error } = await supabase.from("availability").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/garden");
  revalidatePath("/tasks/new");
}
