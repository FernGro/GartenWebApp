"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { getMemberAdjustments } from "@/lib/adjustments/queries";
import { applyPointAdjustments } from "@/lib/adjustments/scores";
import { getAvailability } from "@/lib/availability/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createNotification } from "@/lib/notifications/send";
import { suggestAssignee } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTasks } from "@/lib/tasks/queries";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function reassignOpenTasksAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");

  if (!gardenId) {
    throw new Error("Garten fehlt.");
  }

  const role = await getUserGardenRole(supabase, gardenId, user.id);

  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen Aufgaben neu zuweisen.");
  }

  const [members, tasks, availability, adjustments] = await Promise.all([
    getGardenMembers(supabase, gardenId),
    getTasks(supabase, gardenId),
    getAvailability(supabase, gardenId),
    getMemberAdjustments(supabase, gardenId),
  ]);
  const mutableScores = applyPointAdjustments(calculateScores(tasks, members), adjustments);
  const plannedCounts = new Map<string, number>();
  let previousAssignee: string | null = null;
  const fixedUpcoming = tasks
    .filter((task) => task.assignment_locked && task.assigned_to && task.status !== "done" && task.status !== "cancelled")
    .sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"));

  for (const task of fixedUpcoming) {
    const score = mutableScores.find((row) => row.userId === task.assigned_to);
    if (score) {
      score.points += task.points;
      score.lastCompletedAt = task.due_date ?? score.lastCompletedAt;
    }
    plannedCounts.set(task.assigned_to as string, (plannedCounts.get(task.assigned_to as string) ?? 0) + 1);
  }

  const candidates = tasks
    .filter((task) => !task.assignment_locked && (task.status === "open" || task.status === "assigned" || task.status === "overdue"))
    .sort((a, b) => (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31"));

  for (const task of candidates) {
    const ranked = [...mutableScores]
      .map((score) => ({ ...score, plannedCount: plannedCounts.get(score.userId) ?? 0 }))
      .sort((a, b) => a.points - b.points || a.plannedCount - b.plannedCount || (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? ""));
    const preferred = ranked.length > 1
      ? ranked.find((score) => score.userId !== previousAssignee)
      : ranked[0];
    const suggestion = preferred && !availability.some((entry) => entry.user_id === preferred.userId && task.due_date && entry.from_date <= task.due_date && entry.to_date >= task.due_date)
      ? preferred
      : suggestAssignee(mutableScores, task.due_date, availability);

    if (!suggestion) {
      continue;
    }

    const score = mutableScores.find((row) => row.userId === suggestion.userId);
    if (score) {
      score.points += task.points;
      score.lastCompletedAt = task.due_date ?? new Date().toISOString().slice(0, 10);
    }
    plannedCounts.set(suggestion.userId, (plannedCounts.get(suggestion.userId) ?? 0) + 1);
    previousAssignee = suggestion.userId;

    if (suggestion.userId === task.assigned_to) {
      continue;
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        assigned_to: suggestion.userId,
        status: "assigned",
      })
      .eq("id", task.id);

    if (error) {
      throw new Error(error.message);
    }

    await supabase.from("task_events").insert({
      task_id: task.id,
      garden_id: gardenId,
      actor_id: user.id,
      event_type: "reassigned",
      from_user_id: task.assigned_to,
      to_user_id: suggestion.userId,
      note: "Fair neu zugewiesen",
    });

    await createNotification(supabase, {
      userId: suggestion.userId,
      gardenId,
      type: "task_reassigned",
      title: "Aufgabe neu zugewiesen",
      message: task.title,
      relatedTaskId: task.id,
    });

  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/forecast");
}
