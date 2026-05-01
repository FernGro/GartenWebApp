import { addTaskCommentAction } from "@/lib/tasks/comment-actions";
import { formatDateTime } from "@/lib/format/date";
import type { TaskComment, TaskEvent } from "@/types/domain";
import { Button } from "@/components/ui/button";

const eventLabels: Record<string, string> = {
  created: "erstellt",
  assigned: "zugewiesen",
  reassigned: "neu zugewiesen",
  accepted: "uebernommen",
  completed: "erledigt",
  reopened: "wieder geoeffnet",
  postponed: "verschoben",
  cancelled: "abgebrochen",
  commented: "kommentiert",
};

export function TaskDiscussion({
  taskId,
  gardenId,
  comments,
  events,
}: {
  taskId: string;
  gardenId: string;
  comments: TaskComment[];
  events: TaskEvent[];
}) {
  return (
    <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Kommentare</h2>
        <div className="mt-3 space-y-3">
          {comments.map((comment) => (
            <article className="rounded-lg bg-[#f2f7ec] p-3" key={comment.id}>
              <div className="flex justify-between gap-3 text-xs text-[#6d7669]">
                <span className="font-semibold">{comment.profiles?.display_name ?? "Mitglied"}</span>
                <span>{formatDateTime(comment.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-[#172016]">{comment.comment}</p>
            </article>
          ))}
          {comments.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine Kommentare.</p> : null}
        </div>
        <form action={addTaskCommentAction} className="mt-4 space-y-3">
          <input name="task_id" type="hidden" value={taskId} />
          <input name="garden_id" type="hidden" value={gardenId} />
          <textarea
            className="min-h-24 w-full rounded-lg border border-[#cbd8c1] px-3 py-3"
            name="comment"
            placeholder="Kommentar schreiben"
            required
          />
          <Button type="submit">Kommentar speichern</Button>
        </form>
      </div>
      <aside className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Verlauf</h2>
        <ol className="mt-3 space-y-3">
          {events.map((event) => (
            <li className="border-l-2 border-[#c8dfb7] pl-3" key={event.id}>
              <div className="text-sm font-semibold">
                {event.actor_profile?.display_name ?? "System"} {eventLabels[event.event_type] ?? event.event_type}
              </div>
              <div className="text-xs text-[#6d7669]">{formatDateTime(event.created_at)}</div>
              {event.note ? <div className="mt-1 text-xs text-[#42513d]">{event.note}</div> : null}
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
