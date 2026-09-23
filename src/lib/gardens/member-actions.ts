"use server";

import { runAction } from "@/lib/actions/run-action";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { todayIsoDate } from "@/lib/format/date";
import { getUserGardenRole } from "@/lib/gardens/roles";
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

async function assertMayChangeMember(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  gardenId: string,
  memberId: string,
  userId: string,
) {
  const [callerRole, { data: target, error }] = await Promise.all([
    getUserGardenRole(supabase, gardenId, userId),
    supabase.from("garden_members").select("role").eq("id", memberId).eq("garden_id", gardenId).maybeSingle(),
  ]);

  if (error || !target) {
    throw new Error(error?.message ?? "Mitglied wurde nicht gefunden.");
  }

  if (callerRole !== "owner" && callerRole !== "admin") {
    throw new Error("Nur Owner/Admin duerfen Mitglieder verwalten.");
  }

  return target.role;
}

export async function updateMemberRoleAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const memberId = readString(formData, "member_id");
    const gardenId = readString(formData, "garden_id");
    const role = readString(formData, "role") as GardenRole;

    if (!memberId || !gardenId || !["owner", "admin", "member"].includes(role)) {
      throw new Error("Mitgliedsdaten sind ungueltig.");
    }

    const currentRole = await assertMayChangeMember(supabase, gardenId, memberId, user.id);

    if (currentRole === "owner" && role !== "owner" && (await activeOwnerCount(gardenId)) <= 1) {
      throw new Error("Der letzte Owner kann nicht heruntergestuft werden.");
    }

    const { error } = await supabase.from("garden_members").update({ role }).eq("id", memberId).eq("garden_id", gardenId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/settings/members");
  });
}

export async function setMemberActiveAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const memberId = readString(formData, "member_id");
    const gardenId = readString(formData, "garden_id");
    const active = readString(formData, "active") === "true";
    const leftOn = readString(formData, "left_on") || todayIsoDate();

    if (!memberId || !gardenId) {
      throw new Error("Mitglied fehlt.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(leftOn) || leftOn > todayIsoDate()) {
      throw new Error("Auszugsdatum ist ungueltig oder liegt in der Zukunft.");
    }

    const currentRole = await assertMayChangeMember(supabase, gardenId, memberId, user.id);

    if (!active && currentRole === "owner" && (await activeOwnerCount(gardenId)) <= 1) {
      throw new Error("Der letzte Owner kann nicht deaktiviert werden.");
    }

    const { error } = await supabase.from("garden_members").update(active ? { is_active: true, left_on: null, joined_on: todayIsoDate() } : { is_active: false, left_on: leftOn })
      .eq("id", memberId).eq("garden_id", gardenId);

    if (error) {
      throw new Error(error.message);
    }

    if (!active) {
      const { data: member } = await supabase.from("garden_members").select("user_id").eq("id", memberId).maybeSingle();

      if (member) {
        const { error: taskError } = await supabase
          .from("tasks")
          .update({ assigned_to: null, status: "open" })
          .eq("garden_id", gardenId)
          .eq("assigned_to", member.user_id)
          .in("status", ["assigned", "overdue", "postponed"]);

        if (taskError) {
          throw new Error(taskError.message);
        }
      }
    }

    revalidatePath("/settings/members");
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
  });
}

export async function restoreOwnerAction(formData: FormData) {
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

    const { error } = await supabase.rpc("restore_garden_creator_owner", {
      target_garden_id: gardenId,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/settings/members");
  });
}

export async function updateMemberDatesAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const memberId = readString(formData, "member_id");
    const gardenId = readString(formData, "garden_id");
    const joinedOn = readString(formData, "joined_on");
    const leftOn = readString(formData, "left_on") || null;
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;

    if (!memberId || !gardenId || !isoDate.test(joinedOn) || (leftOn && !isoDate.test(leftOn))) {
      throw new Error("Bitte gueltige Daten angeben.");
    }

    if (joinedOn > todayIsoDate() || (leftOn && (leftOn < joinedOn || leftOn > todayIsoDate()))) {
      throw new Error("Einzug darf nicht in der Zukunft und Auszug nicht vor dem Einzug liegen.");
    }

    await assertMayChangeMember(supabase, gardenId, memberId, user.id);

    const { error } = await supabase
      .from("garden_members")
      .update(leftOn ? { joined_on: joinedOn, left_on: leftOn } : { joined_on: joinedOn })
      .eq("id", memberId)
      .eq("garden_id", gardenId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/settings/members");
    revalidatePath("/billing");
  });
}
