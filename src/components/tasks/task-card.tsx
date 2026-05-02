import Link from "next/link";
import {
  approveCompletionAction,
  completeTaskAction,
  deleteTaskAction,
  rejectCompletionAction,
  requestTakeoverAction,
  reopenTaskAction,
  restoreTaskAction,
} from "@/lib/tasks/actions";
import { formatDate } from "@/lib/format/date";
import type { TaskWithPeople } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TaskIcon } from "@/components/tasks/task-icon";

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
  const canComplete = currentUserId && task.assigned_to === currentUserId && task.status === "assigned";
  const canRequestTakeover = currentUserId && task.assigned_to !== currentUserId && ["open", "assigned", "overdue", "postponed"].includes(task.status);

  return (
    <article className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <TaskIcon title={task.title} />
          <div className="min-w-0">
            <Link className="text-base font-bold text-[#172016] hover:underline" href={`/tasks/${task.id}`}>
              {task.title}
            </Link>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6d7669]">
              <span className="rounded-full bg-[#eef4e8] px-2 py-1">{task.points} Punkte</span>
              {task.due_date ? <span className="rounded-full bg-[#f4efe1] px-2 py-1">Faellig {formatDate(task.due_date)}</span> : null}
              {task.assigned_profile ? <span className="rounded-full bg-[#edf1e8] px-2 py-1">{task.assigned_profile.display_name}</span> : null}
            </div>
          </div>
        </div>
        <StatusBadge status={task.status} />
      </div>
      {!compact && task.description ? <p className="mt-3 text-sm text-[#42513d]">{task.description}</p> : null}
      {canComplete ? (
        <form action={completeTaskAction} className="mt-4">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input name="points" type="hidden" value={task.points} />
          <Button className="w-full sm:w-auto" type="submit">
            Erledigung melden
          </Button>
        </form>
      ) : null}
      {task.status === "pending_review" && canManage ? (
        <div className="mt-4 rounded-lg bg-[#fff7e8] p-3">
          <div className="text-sm font-semibold text-[#915b10]">Erledigung wartet auf Bestaetigung.</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <form action={approveCompletionAction}>
              <input name="task_id" type="hidden" value={task.id} />
              <input name="garden_id" type="hidden" value={task.garden_id} />
              <input name="completed_by" type="hidden" value={task.completed_by ?? task.assigned_to ?? ""} />
              <input name="points" type="hidden" value={task.points} />
              <Button className="w-full" type="submit">Bestaetigen</Button>
            </form>
            <form action={rejectCompletionAction} className="flex flex-col gap-2">
              <input name="task_id" type="hidden" value={task.id} />
              <input name="garden_id" type="hidden" value={task.garden_id} />
              <input name="completed_by" type="hidden" value={task.completed_by ?? ""} />
              <input className="min-h-11 rounded-lg border border-[#cbd8c1] px-3 py-2 text-sm" name="note" placeholder="Grund" />
              <Button className="w-full" variant="secondary" type="submit">Ablehnen</Button>
            </form>
          </div>
        </div>
      ) : null}
      {canRequestTakeover ? (
        <form action={requestTakeoverAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input name="current_assignee" type="hidden" value={task.assigned_to ?? ""} />
          <input
            className="min-h-11 flex-1 rounded-lg border border-[#cbd8c1] px-3 py-2 text-sm"
            name="note"
            placeholder="Warum willst du uebernehmen?"
          />
          <Button variant="secondary" type="submit">
            Uebernahme anfragen
          </Button>
        </form>
      ) : null}
      {task.status === "done" && canManage ? (
        <form action={reopenTaskAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input
            className="min-h-11 flex-1 rounded-lg border border-[#cbd8c1] px-3 py-2 text-sm"
            name="note"
            placeholder="Grund fuer Ruecknahme"
          />
          <Button variant="secondary" type="submit">
            Erledigung rueckgaengig
          </Button>
        </form>
      ) : null}
      {task.status === "cancelled" && canManage ? (
        <form action={restoreTaskAction} className="mt-3">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input name="assigned_to" type="hidden" value={task.assigned_to ?? ""} />
          <Button variant="secondary" type="submit">
            Wiederherstellen
          </Button>
        </form>
      ) : null}
      {canManage && task.status !== "cancelled" ? (
        <form action={deleteTaskAction} className="mt-3">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <Button variant="ghost" type="submit">
            In Papierkorb
          </Button>
        </form>
      ) : null}
    </article>
  );
}
