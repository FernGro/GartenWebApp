"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateGardenAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const name = readString(formData, "name");

  if (!gardenId || !name) {
    throw new Error("Gartenname fehlt.");
  }

  const { error } = await supabase.from("gardens").update({ name }).eq("id", gardenId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/garden");
  revalidatePath("/dashboard");
}
