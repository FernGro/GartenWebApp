import { GardenCalendar } from "@/components/calendar/garden-calendar";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getMemberAdjustments } from "@/lib/adjustments/queries";
import { applyPointAdjustments } from "@/lib/adjustments/scores";
import { getAvailability } from "@/lib/availability/queries";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { buildThreeMonthForecast } from "@/lib/planning/forecast";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTaskTemplates, getTasks } from "@/lib/tasks/queries";
import { getWetterOnlineForecast } from "@/lib/weather/wetteronline";

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

  const [tasks, availability, templates, members, adjustments] = await Promise.all([
    getTasks(supabase, garden.id),
    getAvailability(supabase, garden.id),
    getTaskTemplates(supabase, garden.id),
    getGardenMembers(supabase, garden.id),
    getMemberAdjustments(supabase, garden.id),
  ]);
  const scores = applyPointAdjustments(calculateScores(tasks, members), adjustments);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const forecast = buildThreeMonthForecast(templates, scores, availability, tasks, monthStart);
  const weather = await getWetterOnlineForecast(garden.weather_location ?? garden.name);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">{garden.name}</p>
        <h1 className="text-3xl font-bold">Kalender</h1>
        <p className="mt-2 text-sm text-[#5a6655]">Aufgaben und Abwesenheiten in einer Monatsuebersicht.</p>
      </div>
      <GardenCalendar tasks={tasks} forecast={forecast} availability={availability} weather={weather} year={year} month={month} />
    </AppShell>
  );
}
