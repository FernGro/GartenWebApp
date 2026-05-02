import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvailability } from "@/lib/availability/queries";
import { formatDate } from "@/lib/format/date";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { buildThreeMonthForecast } from "@/lib/planning/forecast";
import { createClient } from "@/lib/supabase/server";
import { calculateScores, getTaskTemplates, getTasks } from "@/lib/tasks/queries";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;

  if (!supabase || !garden) {
    return (
      <AppShell>
        <EmptyState title="Kein Garten">Lege zuerst einen Garten an oder nimm eine Einladung an.</EmptyState>
      </AppShell>
    );
  }

  const [templates, tasks, members, availability] = await Promise.all([
    getTaskTemplates(supabase, garden.id),
    getTasks(supabase, garden.id),
    getGardenMembers(supabase, garden.id),
    getAvailability(supabase, garden.id),
  ]);
  const scores = calculateScores(tasks, members);
  const forecast = buildThreeMonthForecast(templates, scores, availability);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">{garden.name}</p>
        <h1 className="text-3xl font-bold">3-Monats-Forecast</h1>
        <p className="mt-2 text-sm text-[#5a6655]">
          Das sind nur Vorschlaege. Erst beim Erzeugen oder Uebernehmen werden Aufgaben verbindlich zugewiesen.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5">
        {forecast.map((row) => (
          <div className="grid gap-2 border-b border-[#e5ecdc] p-4 text-sm sm:grid-cols-[140px_1fr_160px_auto]" key={`${row.sourceTemplateId}-${row.dueDate}`}>
            <div className="font-semibold">{formatDate(row.dueDate)}</div>
            <div className="font-bold">{row.title}</div>
            <div className="text-[#42513d]">{row.suggestedName}</div>
            <div className="font-semibold text-[#2f6b3f]">{row.points} Punkte</div>
          </div>
        ))}
        {forecast.length === 0 ? <div className="p-4"><EmptyState title="Kein Forecast">Keine saisonalen wiederkehrenden Vorlagen fuer die naechsten drei Monate.</EmptyState></div> : null}
      </div>
    </AppShell>
  );
}
