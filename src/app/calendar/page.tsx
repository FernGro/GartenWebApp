import { GardenCalendar } from "@/components/calendar/garden-calendar";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvailability } from "@/lib/availability/queries";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { createClient } from "@/lib/supabase/server";
import { getTasks } from "@/lib/tasks/queries";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = Number(params.month ?? now.getMonth() + 1);
  const year = Number(params.year ?? now.getFullYear());
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;

  if (!supabase || !garden) {
    return (
      <AppShell>
        <EmptyState title="Kein Garten">Lege zuerst einen Garten an oder nimm eine Einladung an.</EmptyState>
      </AppShell>
    );
  }

  const [tasks, availability] = await Promise.all([
    getTasks(supabase, garden.id),
    getAvailability(supabase, garden.id),
  ]);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">{garden.name}</p>
        <h1 className="text-3xl font-bold">Kalender</h1>
        <p className="mt-2 text-sm text-[#5a6655]">Aufgaben und Abwesenheiten in einer Monatsuebersicht.</p>
      </div>
      <GardenCalendar tasks={tasks} availability={availability} year={year} month={month} />
    </AppShell>
  );
}
