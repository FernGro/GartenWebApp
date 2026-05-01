"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { GardenRole } from "@/types/domain";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createInviteAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const email = readString(formData, "email") || null;
  const role = readString(formData, "role") as GardenRole;

  if (!gardenId || !["admin", "member"].includes(role)) {
    throw new Error("Invite ist ungueltig.");
  }

  const { error } = await supabase.from("garden_invites").insert({
    garden_id: gardenId,
    email,
    role,
    created_by: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/members");
}

export async function acceptInviteAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const token = readString(formData, "token");

  if (!token) {
    throw new Error("Invite fehlt.");
  }

  const { error } = await supabase.rpc("accept_garden_invite", { invite_token: token });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
