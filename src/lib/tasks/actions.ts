"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAvailability } from "@/lib/availability/queries";
import { getGardenMembers } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createNotification } from "@/lib/notifications/send";
import { suggestAssignee } from "@/lib/planning/fairness";
import { assertCleanOptionalText, assertCleanText } from "@/lib/moderation/content";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTasks } from "@/lib/tasks/queries";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const title = readString(formData, "title");
  const description = readString(formData, "description") || null;
  const dueDate = readString(formData, "due_date") || null;
  let assignedTo = readString(formData, "assigned_to") || null;
  const points = Number(readString(formData, "points"));

  if (!gardenId || !title || !Number.isInteger(points) || points < 1 || points > 5) {
    throw new Error("Bitte Titel, Garten und Punkte korrekt ausfuellen.");
  }

  assertCleanText(title, "Aufgabentitel");
  assertCleanOptionalText(description, "Aufgabenbeschreibung");

  if (!assignedTo) {
    const [members, tasks, availability] = await Promise.all([
      getGardenMembers(supabase, gardenId),
      getTasks(supabase, gardenId),
      getAvailability(supabase, gardenId),
    ]);
    const suggestion = suggestAssignee(calculateScores(tasks, members), dueDate, availability);
    assignedTo = suggestion?.userId ?? null;
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      garden_id: gardenId,
      title,
      description,
      due_date: dueDate,
      points,
      assigned_to: assignedTo,
      original_assignee: assignedTo,
      status: assignedTo ? "assigned" : "open",
      created_by: user.id,
    })
    .select("id,garden_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: task.id,
    garden_id: task.garden_id,
    actor_id: user.id,
    event_type: assignedTo ? "assigned" : "created",
    to_user_id: assignedTo,
    note: "Aufgabe erstellt",
  });

  if (assignedTo) {
    await createNotification(supabase, {
      userId: assignedTo,
      gardenId,
      type: "task_assigned",
      title: "Neue Aufgabe",
      message: title,
      relatedTaskId: task.id,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect(`/tasks/${task.id}`);
}

export async function completeTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const points = Number(readString(formData, "points"));

  if (!taskId || !gardenId) {
    throw new Error("Aufgabe konnte nicht gefunden werden.");
  }

  const { data: existingTask, error: taskError } = await supabase
    .from("tasks")
    .select("id,garden_id,title,due_date,assigned_to,status")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError || !existingTask) {
    throw new Error(taskError?.message ?? "Aufgabe wurde nicht gefunden.");
  }

  if (existingTask.assigned_to !== user.id) {
    throw new Error("Nur die zugewiesene Person kann diese Aufgabe erledigen. Bitte erst Uebernahme anfragen.");
  }

  if (existingTask.due_date) {
    const today = new Date().toISOString().slice(0, 10);
    const earliest = new Date(`${existingTask.due_date}T00:00:00.000Z`);
    earliest.setUTCDate(earliest.getUTCDate() - 7);
    const latest = new Date(`${existingTask.due_date}T00:00:00.000Z`);
    latest.setUTCDate(latest.getUTCDate() + 7);

    if (today < earliest.toISOString().slice(0, 10) || today > latest.toISOString().slice(0, 10)) {
      throw new Error("Diese Aufgabe kann nur im Zeitraum 7 Tage vor bis 7 Tage nach Faelligkeit erledigt werden.");
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      status: "pending_review",
      completed_by: user.id,
      completed_at: null,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "accepted",
    to_user_id: user.id,
    points_delta: null,
    note: "Erledigung zur Pruefung gemeldet",
  });

  const role = await getUserGardenRole(supabase, gardenId, user.id);
  const members = await getGardenMembers(supabase, gardenId);
  const managers = members.filter((member) => member.role === "owner" || member.role === "admin");
  await Promise.all(
    managers
      .filter((member) => member.user_id !== user.id || !canManageGarden(role))
      .map((member) =>
        createNotification(supabase, {
          userId: member.user_id,
          gardenId,
          type: "task_completion_review",
          title: "Erledigung pruefen",
          message: existingTask.title,
          relatedTaskId: taskId,
        }),
      ),
  );

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function approveCompletionAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const completedBy = readString(formData, "completed_by");
  const points = Number(readString(formData, "points"));

  if (!taskId || !gardenId || !completedBy) {
    throw new Error("Pruefung ist ungueltig.");
  }

  const role = await getUserGardenRole(supabase, gardenId, user.id);

  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen Erledigungen bestaetigen.");
  }

  const completedAt = new Date().toISOString();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "done", completed_by: completedBy, completed_at: completedAt })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "completed",
    to_user_id: completedBy,
    points_delta: Number.isFinite(points) ? points : null,
    note: "Erledigung durch Owner/Admin bestaetigt",
  });

  await createNotification(supabase, {
    userId: completedBy,
    gardenId,
    type: "task_completed_approved",
    title: "Erledigung bestaetigt",
    message: "Deine Aufgabe wurde bestaetigt.",
    relatedTaskId: taskId,
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function rejectCompletionAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const completedBy = readString(formData, "completed_by");
  const note = readString(formData, "note") || "Erledigung abgelehnt";

  if (!taskId || !gardenId) {
    throw new Error("Pruefung ist ungueltig.");
  }

  assertCleanText(note, "Grund");

  const role = await getUserGardenRole(supabase, gardenId, user.id);

  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen Erledigungen ablehnen.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "assigned", completed_by: null, completed_at: null })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "reopened",
    from_user_id: completedBy || null,
    note,
  });

  if (completedBy) {
    await createNotification(supabase, {
      userId: completedBy,
      gardenId,
      type: "task_completion_rejected",
      title: "Erledigung abgelehnt",
      message: note,
      relatedTaskId: taskId,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function requestTakeoverAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const currentAssignee = readString(formData, "current_assignee") || null;
  const note = readString(formData, "note") || null;

  if (!taskId || !gardenId) {
    throw new Error("Aufgabe fehlt.");
  }

  assertCleanOptionalText(note, "Begruendung");

  const { error } = await supabase.from("task_takeover_requests").insert({
    task_id: taskId,
    garden_id: gardenId,
    requested_by: user.id,
    current_assignee: currentAssignee,
    note,
  });

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "accepted",
    from_user_id: currentAssignee,
    to_user_id: user.id,
    note: "Uebernahme angefragt",
  });

  if (currentAssignee) {
    await createNotification(supabase, {
      userId: currentAssignee,
      gardenId,
      type: "task_takeover_requested",
      title: "Uebernahme angefragt",
      message: "Jemand moechte deine Aufgabe uebernehmen.",
      relatedTaskId: taskId,
    });
  }

  revalidatePath(`/tasks/${taskId}`);
}

export async function decideTakeoverAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const requestId = readString(formData, "request_id");
  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const requestedBy = readString(formData, "requested_by");
  const currentAssignee = readString(formData, "current_assignee") || null;
  const decision = readString(formData, "decision");

  if (!requestId || !taskId || !gardenId || !requestedBy || !["approved", "rejected"].includes(decision)) {
    throw new Error("Uebernahme-Anfrage ist ungueltig.");
  }

  const role = await getUserGardenRole(supabase, gardenId, user.id);
  const mayDecide = canManageGarden(role) || currentAssignee === user.id;

  if (!mayDecide) {
    throw new Error("Nur aktuelle Zuweisung oder Owner/Admin duerfen diese Uebernahme entscheiden.");
  }

  const decidedAt = new Date().toISOString();
  const { error } = await supabase
    .from("task_takeover_requests")
    .update({ status: decision as "approved" | "rejected", decided_by: user.id, decided_at: decidedAt })
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  if (decision === "approved") {
    const { error: taskError } = await supabase
      .from("tasks")
      .update({ assigned_to: requestedBy, status: "assigned" })
      .eq("id", taskId);

    if (taskError) {
      throw new Error(taskError.message);
    }
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: decision === "approved" ? "reassigned" : "cancelled",
    from_user_id: currentAssignee,
    to_user_id: decision === "approved" ? requestedBy : null,
    note: decision === "approved" ? "Uebernahme bestaetigt" : "Uebernahme abgelehnt",
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function reopenTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const note = readString(formData, "note") || "Erledigung durch Admin/Owner rueckgaengig gemacht";

  if (!taskId || !gardenId) {
    throw new Error("Aufgabe fehlt.");
  }

  assertCleanText(note, "Grund");

  const role = await getUserGardenRole(supabase, gardenId, user.id);

  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen Aufgaben wieder oeffnen.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: "assigned", completed_by: null, completed_at: null })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "reopened",
    note,
  });

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(formData: FormData) {
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
    throw new Error("Nur Owner/Admin duerfen Aufgaben loeschen.");
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("title,points,assigned_to,completed_by,status")
    .eq("id", taskId)
    .maybeSingle();

  const { error } = await supabase
    .from("tasks")
    .update({ status: "cancelled", completed_by: null, completed_at: null })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "cancelled",
    from_user_id: task?.assigned_to ?? task?.completed_by ?? null,
    points_delta: task?.status === "done" ? -(task?.points ?? 0) : null,
    note: `Aufgabe in Papierkorb verschoben: ${task?.title ?? taskId}`,
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect("/tasks");
}

export async function restoreTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const taskId = readString(formData, "task_id");
  const gardenId = readString(formData, "garden_id");
  const assignedTo = readString(formData, "assigned_to") || null;

  if (!taskId || !gardenId) {
    throw new Error("Aufgabe fehlt.");
  }

  const role = await getUserGardenRole(supabase, gardenId, user.id);

  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen Aufgaben wiederherstellen.");
  }

  const { error } = await supabase
    .from("tasks")
    .update({ status: assignedTo ? "assigned" : "open" })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: taskId,
    garden_id: gardenId,
    actor_id: user.id,
    event_type: "reopened",
    note: "Aufgabe aus Papierkorb wiederhergestellt",
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${taskId}`);
}

export async function createCompletedTaskAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const title = readString(formData, "title");
  const description = readString(formData, "description") || "Nachtraeglich erfasst";
  const completedBy = readString(formData, "completed_by");
  const completedOn = readString(formData, "completed_on");
  const points = Number(readString(formData, "points"));

  if (!gardenId || !title || !completedBy || !completedOn || !Number.isInteger(points) || points < 1 || points > 5) {
    throw new Error("Nachtrag ist ungueltig.");
  }

  assertCleanText(title, "Aufgabentitel");
  assertCleanText(description, "Aufgabenbeschreibung");

  const role = await getUserGardenRole(supabase, gardenId, user.id);

  if (!canManageGarden(role)) {
    throw new Error("Nur Owner/Admin duerfen erledigte Aufgaben nachtragen.");
  }

  const completedAt = `${completedOn}T12:00:00.000Z`;
  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      garden_id: gardenId,
      title,
      description,
      points,
      due_date: completedOn,
      assigned_to: completedBy,
      original_assignee: completedBy,
      completed_by: completedBy,
      completed_at: completedAt,
      status: "done",
      created_by: user.id,
    })
    .select("id,garden_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("task_events").insert({
    task_id: task.id,
    garden_id: task.garden_id,
    actor_id: user.id,
    event_type: "completed",
    to_user_id: completedBy,
    points_delta: points,
    note: "Erledigte Aufgabe nachtraeglich erfasst",
  });

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  redirect(`/tasks/${task.id}`);
}
