"use server";

import { runAction } from "@/lib/actions/run-action";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateGardenAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");
    const name = readString(formData, "name");

    if (!gardenId || !name) {
      throw new Error("Gartenname fehlt.");
    }

    if (!canManageGarden(await getUserGardenRole(supabase, gardenId, user.id))) {
      throw new Error("Nur Owner/Admin duerfen das aendern.");
    }

    const { error } = await supabase.from("gardens").update({ name }).eq("id", gardenId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/settings/garden");
    revalidatePath("/dashboard");
  });
}

export async function updateChatSettingsAction(formData: FormData) {
  return runAction(async () => {
    await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");
    const retentionRaw = readString(formData, "chat_retention_days");
    const retentionDays = parseInt(retentionRaw, 10);

    if (!gardenId) throw new Error("Garten fehlt.");
    if (isNaN(retentionDays) || retentionDays < 0) throw new Error("Ungültige Angabe.");

    const { error } = await supabase
      .from("gardens")
      .update({ chat_retention_days: retentionDays })
      .eq("id", gardenId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/settings/garden");
  });
}

export async function updateWeatherSettingsAction(formData: FormData) {
  return runAction(async () => {
    await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");
    const weatherLocation = readString(formData, "weather_location") || null;

    if (!gardenId) throw new Error("Garten fehlt.");

    const { error } = await supabase
      .from("gardens")
      .update({ weather_location: weatherLocation })
      .eq("id", gardenId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/settings/garden");
  });
}

export async function leaveGardenAction(formData: FormData) {
  return runAction(async () => {
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
  });
}

export async function deleteGardenAction(formData: FormData) {
  return runAction(async () => {
    await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");

    if (!gardenId) {
      throw new Error("Garten fehlt.");
    }

    if (readString(formData, "confirm") !== "LOESCHEN") {
      throw new Error("Bitte zur Bestaetigung LOESCHEN eintippen.");
    }

    const { error } = await supabase.rpc("delete_garden", { target_garden_id: gardenId });

    if (error) {
      throw new Error(error.message);
    }

    redirect("/dashboard");
  });
}
