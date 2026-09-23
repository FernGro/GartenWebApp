import Link from "next/link";
import {
  completeTaskAction,
  deleteTaskAction,
  lockTaskAssignmentAction,
  requestTakeoverAction,
  reopenTaskAction,
  restoreTaskAction,
  unlockTaskAssignmentAction,
} from "@/lib/tasks/actions";
import { formatDate } from "@/lib/format/date";
import { daysUntilCompletionWindow, getCompletionWindow, isWithinCompletionWindow } from "@/lib/tasks/completion-window";
import type { TaskWithPeople } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TaskIcon } from "@/components/tasks/task-icon";
import { ActionForm } from "@/components/ui/action-form";

export function TaskCard({
  task,
  compact = false,
  currentUserId,
  canManage = false,
}: {
  task: TaskWithPeople;
  compact?: boolean;
  currentUserId?: string;
  canManage?: boolean;
}) {
  const canComplete = currentUserId && task.assigned_to === currentUserId && ["assigned", "overdue", "postponed"].includes(task.status);
  const isCompletionWindowOpen = !task.due_date || task.status === "overdue" || task.status === "postponed" || isWithinCompletionWindow(task.due_date);
  const completionWindow = task.due_date ? getCompletionWindow(task.due_date) : null;
  const daysUntilWindow = task.due_date ? daysUntilCompletionWindow(task.due_date) : 0;
  const canRequestTakeover = currentUserId && task.assigned_to !== currentUserId && ["open", "assigned", "overdue", "postponed"].includes(task.status);
  const canAcceptTakeoverDirectly = !task.assigned_to || task.status === "overdue" || task.status === "postponed";

  return (
    <article
      className={`rounded-2xl border bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf] ${
        task.status === "overdue" ? "border-[#efc071] border-l-4" : "border-[#d7dfcf]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <TaskIcon title={task.title} />
          <div className="min-w-0">
            <Link className="font-display text-lg font-bold leading-snug text-[#172016] hover:underline" href={`/tasks/${task.id}`}>
              {task.title}
            </Link>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6d7669]">
              <span className="rounded-full bg-[#eef4e8] px-2 py-1">{task.points} Punkte</span>
              {task.due_date ? <span className="rounded-full bg-[#f4efe1] px-2 py-1">Faellig {formatDate(task.due_date)}</span> : null}
              {task.assigned_profile ? <span className="rounded-full bg-[#edf1e8] px-2 py-1">{task.assigned_profile.display_name}</span> : null}
              {task.assignment_locked ? <span className="rounded-full bg-[#dff5e7] px-2 py-1 text-[#17653a]">fixiert</span> : null}
            </div>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>
      {!compact && task.description ? <p className="mt-3 text-sm text-[#42513d]">{task.description}</p> : null}
      {canComplete && isCompletionWindowOpen ? (
        <ActionForm action={completeTaskAction} className="mt-4">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input name="points" type="hidden" value={task.points} />
          <Button className="w-full text-base sm:w-auto" type="submit">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Dienst erledigt
          </Button>
        </ActionForm>
      ) : null}
      {canComplete && !isCompletionWindowOpen && completionWindow ? (
        <div className="mt-4 rounded-lg bg-[#fff7e8] px-4 py-3 text-sm text-[#915b10]">
          Diese Aufgabe kann erst im Zeitraum {formatDate(completionWindow.earliest)} bis {formatDate(completionWindow.latest)} erledigt gemeldet werden.
          {daysUntilWindow > 0 ? ` Das ist in ${daysUntilWindow} Tagen.` : " Das Zeitfenster ist bereits vorbei."}
        </div>
      ) : null}
      {canRequestTakeover ? (
        <ActionForm action={requestTakeoverAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input name="current_assignee" type="hidden" value={task.assigned_to ?? ""} />
          {canAcceptTakeoverDirectly ? null : (
            <input
              aria-label="Grund fuer die Uebernahme"
              className="min-h-11 flex-1 rounded-xl border border-[#cbd8c1] px-3 py-2 text-sm"
              name="note"
              placeholder="Warum willst du uebernehmen? (optional)"
            />
          )}
          <Button variant="secondary" type="submit">
            {canAcceptTakeoverDirectly ? "Dienst uebernehmen" : "Uebernahme anfragen"}
          </Button>
        </ActionForm>
      ) : null}
      {currentUserId === task.assigned_to && !task.assignment_locked && ["open", "assigned", "overdue", "postponed"].includes(task.status) ? (
        <ActionForm action={lockTaskAssignmentAction} className="mt-3">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <Button variant="secondary" type="submit">Diesen Dienst fest einloggen</Button>
        </ActionForm>
      ) : null}
      {canManage && task.assignment_locked ? (
        <ActionForm action={unlockTaskAssignmentAction} className="mt-3">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <Button variant="ghost" type="submit">Fixierung loesen</Button>
        </ActionForm>
      ) : null}
      {!compact && task.status === "done" && canManage ? (
        <ActionForm action={reopenTaskAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input
            className="min-h-11 flex-1 rounded-xl border border-[#cbd8c1] px-3 py-2 text-sm"
            name="note"
            placeholder="Grund fuer Ruecknahme"
          />
          <Button variant="secondary" type="submit">
            Erledigung rueckgaengig
          </Button>
        </ActionForm>
      ) : null}
      {!compact && task.status === "cancelled" && canManage ? (
        <ActionForm action={restoreTaskAction} className="mt-3">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input name="assigned_to" type="hidden" value={task.assigned_to ?? ""} />
          <Button variant="secondary" type="submit">
            Wiederherstellen
          </Button>
        </ActionForm>
      ) : null}
      {!compact && canManage && task.status !== "cancelled" ? (
        <ActionForm action={deleteTaskAction} className="mt-3">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <Button variant="ghost" type="submit">
            In Papierkorb
          </Button>
        </ActionForm>
      ) : null}
    </article>
  );
}
