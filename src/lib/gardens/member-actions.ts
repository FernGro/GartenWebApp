"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { GardenRole } from "@/types/domain";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function activeOwnerCount(gardenId: string) {
  const supabase = await createClient();

  if (!supabase) {
    return 0;
  }

  const { count } = await supabase
    .from("garden_members")
    .select("id", { count: "exact", head: true })
    .eq("garden_id", gardenId)
    .eq("role", "owner")
    .eq("is_active", true);

  return count ?? 0;
}

export async function updateMemberRoleAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const memberId = readString(formData, "member_id");
  const gardenId = readString(formData, "garden_id");
  const role = readString(formData, "role") as GardenRole;
  const currentRole = readString(formData, "current_role") as GardenRole;

  if (!memberId || !gardenId || !["owner", "admin", "member"].includes(role)) {
    throw new Error("Mitgliedsdaten sind ungueltig.");
  }

  if (currentRole === "owner" && role !== "owner" && (await activeOwnerCount(gardenId)) <= 1) {
    throw new Error("Der letzte Owner kann nicht heruntergestuft werden.");
  }

  const { error } = await supabase.from("garden_members").update({ role }).eq("id", memberId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/members");
}

export async function setMemberActiveAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const memberId = readString(formData, "member_id");
  const gardenId = readString(formData, "garden_id");
  const currentRole = readString(formData, "current_role") as GardenRole;
  const active = readString(formData, "active") === "true";

  if (!memberId || !gardenId) {
    throw new Error("Mitglied fehlt.");
  }

  if (!active && currentRole === "owner" && (await activeOwnerCount(gardenId)) <= 1) {
    throw new Error("Der letzte Owner kann nicht deaktiviert werden.");
  }

  const { error } = await supabase.from("garden_members").update({ is_active: active }).eq("id", memberId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/members");
  revalidatePath("/dashboard");
}
