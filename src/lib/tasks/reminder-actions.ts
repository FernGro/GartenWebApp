"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getAvailability } from "@/lib/availability/queries";
import { insertSystemChatMessage } from "@/lib/chat/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createNotification } from "@/lib/notifications/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTasks } from "@/lib/tasks/queries";
import { formatWeatherRecommendation, getWetterOnlineForecast } from "@/lib/weather/wetteronline";
import type { AvailabilityWindow, ScoreRow } from "@/types/domain";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function daysDiff(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86_400_000);
}

function mentionName(name: string) {
  return `@${name.trim().replace(/\s+/g, "_")}`;
}

function isUnavailable(userId: string, dueDate: string | null, availability: AvailabilityWindow[]) {
  if (!dueDate) return false;
  return availability.some((entry) => entry.user_id === userId && entry.from_date <= dueDate && entry.to_date >= dueDate);
}

function rankedCandidates(scores: ScoreRow[], currentAssignee: string | null, dueDate: string | null, availability: AvailabilityWindow[]) {
  return [...scores]
    .filter((score) => score.userId !== currentAssignee)
    .filter((score) => !isUnavailable(score.userId, dueDate, availability))
    .sort((a, b) => {
      if (a.points !== b.points) return a.points - b.points;
      if (!a.lastCompletedAt && b.lastCompletedAt) return -1;
      if (a.lastCompletedAt && !b.lastCompletedAt) return 1;
      return (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? "");
    });
}

export async function triggerTaskChatAutomationAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");

  if (!taskId || !gardenId) {
    throw new Error("Aufgabe fehlt.");
  }

  const role = await getUserGardenRole(supabase, gardenId, user.id);
  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen Chat-Erinnerungen manuell ausloesen.");
  }

  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Admin-Client fehlt. SUPABASE_SERVICE_ROLE_KEY muss serverseitig gesetzt sein.");
  }

  const { data: garden } = await admin
    .from("gardens")
    .select("name,weather_location")
    .eq("id", gardenId)
    .maybeSingle();
  const { data: task, error: taskError } = await admin
    .from("tasks")
    .select("id,garden_id,title,status,due_date,assigned_to")
    .eq("id", taskId)
    .eq("garden_id", gardenId)
    .maybeSingle();

  if (taskError || !task) {
    throw new Error(taskError?.message ?? "Aufgabe wurde nicht gefunden.");
  }

  if (!task.assigned_to || task.status === "done" || task.status === "cancelled" || task.status === "pending_review") {
    throw new Error("Fuer diese Aufgabe ist keine Erinnerung noetig.");
  }

  const today = new Date().toISOString().slice(0, 10);
  const [tasks, members, availability, weatherForecast] = await Promise.all([
    getTasks(admin, gardenId),
    getGardenMembers(admin, gardenId),
    getAvailability(admin, gardenId),
    getWetterOnlineForecast(garden?.weather_location ?? garden?.name, today),
  ]);
  const scores = calculateScores(tasks, members);
  const assigneeName = members.find((member) => member.user_id === task.assigned_to)?.profiles?.display_name ?? "Unbekannt";
  const weatherBlock = formatWeatherRecommendation({
    forecast: weatherForecast,
    taskTitle: task.title,
    dueDate: task.due_date,
    today,
  });
  const daysLate = task.due_date ? daysDiff(task.due_date, today) : 0;
  const shouldOfferTakeover = task.status === "postponed" || daysLate >= 5;

  if (shouldOfferTakeover) {
    const candidates = rankedCandidates(scores, task.assigned_to, task.due_date, availability);
    const topCandidate = candidates[0] ?? null;
    const candidateList = candidates.length > 0
      ? candidates.map((score, index) => `${index + 1}. ${score.displayName}: ${score.points} Pkt.`).join("\n")
      : "Keine passende Vertretung gefunden.";

    await insertSystemChatMessage(admin, {
      gardenId,
      content: [
        task.status === "postponed"
          ? `⚠️ "${task.title}" wurde von ${assigneeName} abgegeben.`
          : `⚠️ "${task.title}" ist seit ${daysLate} Tagen überfällig und noch nicht erledigt markiert.`,
        `Bisher zugewiesen: ${assigneeName}`,
        "",
        "Vorschlag nach Score:",
        candidateList,
        "",
        topCandidate
          ? `${mentionName(topCandidate.displayName)} ist nach Score aktuell der sinnvollste Vorschlag.`
          : "Bitte klaert im Chat, wer den Dienst uebernimmt.",
        "",
        weatherBlock,
        "",
        "Jede Person kann die Aufgabe ueber den Uebernahme-Button akzeptieren.",
      ].join("\n"),
      messageType: "system_overdue",
      visibleToUserId: null,
      relatedTaskId: task.id,
      mentionedUserIds: topCandidate ? [topCandidate.userId] : [],
    });

    for (const member of members.filter((member) => member.user_id !== task.assigned_to)) {
      await createNotification(admin, {
        userId: member.user_id,
        gardenId,
        type: "manual_task_takeover_needed",
        title: "Dienst sucht Uebernahme",
        message: task.title,
        relatedTaskId: task.id,
      });
    }
  } else {
    const daysLeft = task.due_date ? daysDiff(today, task.due_date) : null;
    const assigneeMention = mentionName(assigneeName);
    const headline = daysLeft === 0
      ? `⏰ ${assigneeMention} heute fällig: ${task.title}`
      : daysLeft !== null && daysLeft > 0
        ? `⏰ ${assigneeMention} in ${daysLeft} Tagen fällig: ${task.title}`
        : `⏰ ${assigneeMention} Erinnerung: ${task.title}`;

    await insertSystemChatMessage(admin, {
      gardenId,
      content: `${headline}\n\n${weatherBlock}`,
      messageType: "system_reminder",
      visibleToUserId: null,
      relatedTaskId: task.id,
      mentionedUserIds: [task.assigned_to],
    });

    await createNotification(admin, {
      userId: task.assigned_to,
      gardenId,
      type: "manual_chat_task_reminder",
      title: "Dienst-Erinnerung",
      message: task.title,
      relatedTaskId: task.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/chat");
}
