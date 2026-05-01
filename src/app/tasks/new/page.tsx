import { AppShell } from "@/components/layout/app-shell";
import { TaskForm } from "@/components/tasks/task-form";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvailability } from "@/lib/availability/queries";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTaskTemplates, getTasks } from "@/lib/tasks/queries";

export const dynamic = "force-dynamic";

export default async function NewTaskPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;

  if (!supabase || !garden) {
    return (
      <AppShell>
        <EmptyState title="Kein Garten">Lege zuerst im Dashboard einen Garten an.</EmptyState>
      </AppShell>
    );
  }

  const [members, tasks, templates, availability] = await Promise.all([
    getGardenMembers(supabase, garden.id),
    getTasks(supabase, garden.id),
    getTaskTemplates(supabase, garden.id),
    getAvailability(supabase, garden.id),
  ]);
  const scores = calculateScores(tasks, members);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">{garden.name}</p>
        <h1 className="text-3xl font-bold">Aufgabe erstellen</h1>
      </div>
      <TaskForm gardenId={garden.id} members={members} scores={scores} templates={templates} availability={availability} />
    </AppShell>
  );
}
