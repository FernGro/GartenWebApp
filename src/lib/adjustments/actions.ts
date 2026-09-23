"use server";

import { runAction } from "@/lib/actions/run-action";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
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
  return runAction(async () => {
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
  });
}

export async function deleteMemberAdjustmentAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const id = readString(formData, "id");
    const gardenId = readString(formData, "garden_id");

    if (!id || !gardenId) {
      throw new Error("Korrektur fehlt.");
    }

    if (!canManageGarden(await getUserGardenRole(supabase, gardenId, user.id))) {
      throw new Error("Nur Owner/Admin duerfen Korrekturen loeschen.");
    }

    const { data, error } = await supabase.from("member_adjustments").delete().eq("id", id).eq("garden_id", gardenId).select("id");

    if (error) {
      throw new Error(error.message);
    }

    if (!data?.length) {
      throw new Error("Korrektur wurde nicht gefunden oder ist bereits geloescht.");
    }

    revalidatePath("/billing");
  });
}
