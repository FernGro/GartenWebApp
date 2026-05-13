"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getGardenMembers } from "@/lib/gardens/queries";
import { createNotification } from "@/lib/notifications/send";
import { getAvailability } from "@/lib/availability/queries";
import { hasTakeoverCallForTask, insertSystemChatMessage } from "@/lib/chat/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTasks } from "@/lib/tasks/queries";
import type { AvailabilityWindow, ScoreRow } from "@/types/domain";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function mentionName(name: string) {
  return `@${name.trim().replace(/\s+/g, "_")}`;
}

function isUnavailable(userId: string, dueDate: string | null, availability: AvailabilityWindow[]) {
  if (!dueDate) return false;
  return availability.some((entry) => entry.user_id === userId && entry.from_date <= dueDate && entry.to_date >= dueDate);
}

function rankedCandidates(scores: ScoreRow[], skippedUserId: string, dueDate: string | null, availability: AvailabilityWindow[]) {
  return [...scores]
    .filter((score) => score.userId !== skippedUserId)
    .filter((score) => !isUnavailable(score.userId, dueDate, availability))
    .sort((a, b) => {
      if (a.points !== b.points) return a.points - b.points;
      if (!a.lastCompletedAt && b.lastCompletedAt) return -1;
      if (a.lastCompletedAt && !b.lastCompletedAt) return 1;
      return (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? "");
    });
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

  const admin = createAdminClient();
  if (admin) {
    const [tasks, members, availability] = await Promise.all([
      getTasks(admin, gardenId),
      getGardenMembers(admin, gardenId),
      getAvailability(admin, gardenId),
    ]);
    const scores = calculateScores(tasks, members);
    const userName = members.find((member) => member.user_id === user.id)?.profiles?.display_name ?? "Jemand";
    const affectedTasks = tasks.filter(
      (task) =>
        task.assigned_to === user.id &&
        task.due_date !== null &&
        task.due_date >= fromDate &&
        task.due_date <= toDate &&
        ["open", "assigned", "overdue"].includes(task.status),
    );

    for (const task of affectedTasks) {
      const alreadyPosted = await hasTakeoverCallForTask(admin, gardenId, task.id);
      if (alreadyPosted) continue;

      await admin
        .from("tasks")
        .update({ status: "postponed" })
        .eq("id", task.id)
        .eq("garden_id", gardenId);

      await admin.from("task_events").insert({
        task_id: task.id,
        garden_id: gardenId,
        actor_id: user.id,
        event_type: "postponed",
        from_user_id: user.id,
        note: reason ? `Abwesenheit eingetragen: ${reason}` : "Abwesenheit eingetragen",
      });

      const candidates = rankedCandidates(scores, user.id, task.due_date, availability);
      const topCandidate = candidates[0] ?? null;
      const candidateList = candidates.length > 0
        ? candidates.map((score, index) => `${index + 1}. ${score.displayName}: ${score.points} Pkt.`).join("\n")
        : "Keine passende Vertretung gefunden.";

      await insertSystemChatMessage(admin, {
        gardenId,
        content: [
          `⚠️ "${task.title}" wurde von ${userName} spontan abgegeben.`,
          reason ? `Grund: ${reason}` : null,
          "",
          "Vorschlag nach Score:",
          candidateList,
          "",
          topCandidate
            ? `${mentionName(topCandidate.displayName)} ist nach Score aktuell der sinnvollste Vorschlag.`
            : "Bitte klaert im Chat, wer den Dienst uebernimmt.",
          "Jede Person kann die Aufgabe ueber den Uebernahme-Button akzeptieren.",
        ].filter(Boolean).join("\n"),
        messageType: "system_overdue",
        visibleToUserId: null,
        relatedTaskId: task.id,
        mentionedUserIds: topCandidate ? [topCandidate.userId] : [],
      });

      for (const member of members.filter((member) => member.user_id !== user.id)) {
        await createNotification(admin, {
          userId: member.user_id,
          gardenId,
          type: "task_takeover_needed",
          title: "Dienst sucht Uebernahme",
          message: task.title,
          relatedTaskId: task.id,
        });
      }
    }
  }

  revalidatePath("/settings/garden");
  revalidatePath("/tasks/new");
  revalidatePath("/tasks");
  revalidatePath("/chat");
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
