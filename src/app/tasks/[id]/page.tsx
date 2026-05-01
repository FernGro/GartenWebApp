import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { TaskDiscussion } from "@/components/tasks/comment-list";
import { TaskCard } from "@/components/tasks/task-card";
import { formatDateTime } from "@/lib/format/date";
import { createClient } from "@/lib/supabase/server";
import { getTaskComments, getTaskEvents } from "@/lib/tasks/comments";
import { getTask } from "@/lib/tasks/queries";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const task = supabase ? await getTask(supabase, id) : null;

  if (!task) {
    notFound();
  }

  const [comments, events] = supabase
    ? await Promise.all([getTaskComments(supabase, task.id), getTaskEvents(supabase, task.id)])
    : [[], []];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Aufgabe</h1>
      </div>
      <TaskCard task={task} />
      <section className="mt-4 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Details</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[#5a6655]">Erledigt von</dt>
            <dd>{task.completed_profile?.display_name ?? "-"}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[#5a6655]">Erledigt am</dt>
            <dd>{formatDateTime(task.completed_at)}</dd>
          </div>
        </dl>
      </section>
      <TaskDiscussion taskId={task.id} gardenId={task.garden_id} comments={comments} events={events} />
    </AppShell>
  );
}
