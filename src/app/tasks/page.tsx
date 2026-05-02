import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createClient } from "@/lib/supabase/server";
import { reassignOpenTasksAction } from "@/lib/tasks/reassign-actions";
import { getTasks } from "@/lib/tasks/queries";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const role = supabase && garden && user ? await getUserGardenRole(supabase, garden.id, user.id) : null;
  const canManage = canManageGarden(role);
  const tasks = supabase && garden ? await getTasks(supabase, garden.id) : [];

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-[#2f6b3f]">{garden?.name ?? "Kein Garten"}</p>
          <h1 className="text-3xl font-bold">Aufgaben</h1>
        </div>
        <div className="flex gap-2">
          {garden && canManage ? (
            <form action={reassignOpenTasksAction}>
              <input name="garden_id" type="hidden" value={garden.id} />
              <Button variant="secondary" type="submit">Fair neu zuweisen</Button>
            </form>
          ) : null}
          <Link href="/tasks/new">
            <Button>Neu</Button>
          </Link>
        </div>
      </div>
      <div className="grid gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} currentUserId={user?.id} canManage={canManage} />
        ))}
        {tasks.length === 0 ? (
          <EmptyState title="Noch keine Aufgaben">Erstelle die erste Gartenaufgabe.</EmptyState>
        ) : null}
      </div>
    </AppShell>
  );
}
