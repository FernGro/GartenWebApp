import Link from "next/link";
import { completeTaskAction } from "@/lib/tasks/actions";
import { formatDate } from "@/lib/format/date";
import type { TaskWithPeople } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TaskIcon } from "@/components/tasks/task-icon";

export function TaskCard({ task, compact = false }: { task: TaskWithPeople; compact?: boolean }) {
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
      {task.status !== "done" && task.status !== "cancelled" ? (
        <form action={completeTaskAction} className="mt-4">
          <input name="task_id" type="hidden" value={task.id} />
          <input name="garden_id" type="hidden" value={task.garden_id} />
          <input name="points" type="hidden" value={task.points} />
          <Button className="w-full sm:w-auto" type="submit">
            Als erledigt markieren
          </Button>
        </form>
      ) : null}
    </article>
  );
}
