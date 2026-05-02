"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function eurosToCents(value: string) {
  if (!value) {
    return 0;
  }

  return Math.round(Number(value.replace(",", ".")) * 100);
}

export async function createMemberAdjustmentAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const userId = readString(formData, "user_id");
  const pointsDelta = Number(readString(formData, "points_delta") || 0);
  const amountCentsDelta = eurosToCents(readString(formData, "amount_delta"));
  const reason = readString(formData, "reason");

  if (!gardenId || !userId || !reason || !Number.isFinite(pointsDelta) || !Number.isFinite(amountCentsDelta)) {
    throw new Error("Ausgleich ist ungueltig.");
  }

  const { error } = await supabase.from("member_adjustments").insert({
    garden_id: gardenId,
    user_id: userId,
    points_delta: pointsDelta,
    amount_cents_delta: amountCentsDelta,
    reason,
    created_by: user.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/billing");
  revalidatePath("/forecast");
  revalidatePath("/dashboard");
}
