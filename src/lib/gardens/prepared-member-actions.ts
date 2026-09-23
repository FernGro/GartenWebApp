"use server";

import { runAction } from "@/lib/actions/run-action";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GardenRole } from "@/types/domain";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

// Creating an account for someone else requires the service role; the caller's
// Owner/Admin role is checked here and again inside add_prepared_garden_member.
export async function createPreparedMemberAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");
    const displayName = readString(formData, "display_name");
    const email = readString(formData, "email").toLowerCase();
    const role = readString(formData, "role") as GardenRole;
    const replacesUserId = readString(formData, "replaces_user_id") || null;

    if (!gardenId || !displayName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["admin", "member"].includes(role)) {
      throw new Error("Bitte Name, gueltige E-Mail und Rolle angeben.");
    }

    if (!canManageGarden(await getUserGardenRole(supabase, gardenId, user.id))) {
      throw new Error("Nur Owner/Admin duerfen Personen anlegen.");
    }

    const admin = createAdminClient();

    if (!admin) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt auf dem Server.");
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (createError || !created.user) {
      const alreadyExists = createError?.message.toLowerCase().includes("already");
      throw new Error(
        alreadyExists
          ? "Fuer diese E-Mail gibt es schon ein Konto. Bitte stattdessen einen Einladungslink schicken."
          : createError?.message ?? "Konto konnte nicht angelegt werden.",
      );
    }

    const { error: memberError } = await supabase.rpc("add_prepared_garden_member", {
      target_garden_id: gardenId,
      target_user_id: created.user.id,
      target_role: role,
      replaces_user: replacesUserId,
    });

    if (memberError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw new Error(memberError.message);
    }

    revalidatePath("/settings/members");
    revalidatePath("/dashboard");
    revalidatePath("/billing");
  });
}
