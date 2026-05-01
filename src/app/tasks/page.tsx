import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { TaskCard } from "@/components/tasks/task-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { createClient } from "@/lib/supabase/server";
import { getTasks } from "@/lib/tasks/queries";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const tasks = supabase && garden ? await getTasks(supabase, garden.id) : [];

  return (
    <AppShell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-[#2f6b3f]">{garden?.name ?? "Kein Garten"}</p>
          <h1 className="text-3xl font-bold">Aufgaben</h1>
        </div>
        <Link href="/tasks/new">
          <Button>Neu</Button>
        </Link>
      </div>
      <div className="grid gap-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 ? (
          <EmptyState title="Noch keine Aufgaben">Erstelle die erste Gartenaufgabe.</EmptyState>
        ) : null}
      </div>
    </AppShell>
  );
}
