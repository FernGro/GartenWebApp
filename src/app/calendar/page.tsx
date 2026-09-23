import { GardenCalendar } from "@/components/calendar/garden-calendar";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvailability } from "@/lib/availability/queries";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { buildThreeMonthForecast } from "@/lib/planning/forecast";
import { createClient } from "@/lib/supabase/server";
import { getTaskTemplates, getTasks } from "@/lib/tasks/queries";
import { getWetterOnlineForecast } from "@/lib/weather/wetteronline";
import { getRankingScores } from "@/lib/planning/ranking";

export const dynamic = "force-dynamic";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const requestedMonth = Number(params.month);
  const requestedYear = Number(params.year);
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
    ? requestedMonth
    : now.getMonth() + 1;
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
    ? requestedYear
    : now.getFullYear();
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;

  if (!supabase || !garden) {
    return (
      <AppShell>
        <EmptyState title="Kein Garten">Lege zuerst einen Garten an oder nimm eine Einladung an.</EmptyState>
      </AppShell>
    );
  }

  const [tasks, availability, templates, members] = await Promise.all([
    getTasks(supabase, garden.id),
    getAvailability(supabase, garden.id),
    getTaskTemplates(supabase, garden.id),
    getGardenMembers(supabase, garden.id),
  ]);
  const scores = await getRankingScores(supabase, garden.id, tasks, members);
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
