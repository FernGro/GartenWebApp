"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

export async function leaveGardenAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");

  if (!gardenId) {
    throw new Error("Garten fehlt.");
  }

  const { error } = await supabase.rpc("leave_garden", { target_garden_id: gardenId });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}

export async function deleteGardenAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");

  if (!gardenId) {
    throw new Error("Garten fehlt.");
  }

  const { error } = await supabase.rpc("delete_garden", { target_garden_id: gardenId });

  if (error) {
    throw new Error(error.message);
  }

  redirect("/dashboard");
}
