import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getMemberAdjustments } from "@/lib/adjustments/queries";
import { applyPointAdjustments } from "@/lib/adjustments/scores";
import { getAvailability } from "@/lib/availability/queries";
import { formatDate } from "@/lib/format/date";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { lockForecastTaskAction } from "@/lib/planning/actions";
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

  const [templates, tasks, members, availability, adjustments] = await Promise.all([
    getTaskTemplates(supabase, garden.id),
    getTasks(supabase, garden.id),
    getGardenMembers(supabase, garden.id),
    getAvailability(supabase, garden.id),
    getMemberAdjustments(supabase, garden.id),
  ]);
  const user = (await supabase.auth.getUser()).data.user;
  const role = user ? await getUserGardenRole(supabase, garden.id, user.id) : null;
  const canManage = canManageGarden(role);
  const scores = applyPointAdjustments(calculateScores(tasks, members), adjustments);
  const forecast = buildThreeMonthForecast(templates, scores, availability, tasks);

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
          <div className="grid gap-2 border-b border-[#e5ecdc] p-4 text-sm lg:grid-cols-[120px_1fr_180px_120px_160px]" key={`${row.sourceTemplateId}-${row.dueDate}`}>
            <div className="font-semibold">{formatDate(row.dueDate)}</div>
            <div>
              <div className="font-bold">{row.title}</div>
              <div className="mt-1 text-xs text-[#6d7669]">{row.cadenceLabel} · {row.reason}</div>
            </div>
            <div className="text-[#42513d]">{row.suggestedName}</div>
            <div className="font-semibold text-[#2f6b3f]">{row.points} Punkte</div>
            {row.suggestedUserId ? (
              <form action={lockForecastTaskAction}>
                <input name="garden_id" type="hidden" value={garden.id} />
                <input name="template_id" type="hidden" value={row.sourceTemplateId} />
                <input name="title" type="hidden" value={row.title} />
                <input name="due_date" type="hidden" value={row.dueDate} />
                <input name="assigned_to" type="hidden" value={row.suggestedUserId} />
                <input name="points" type="hidden" value={row.points} />
                <button
                  className="min-h-10 rounded-lg bg-[#2f6b3f] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  disabled={row.suggestedUserId !== user?.id && !canManage}
                  type="submit"
                >
                  Einloggen
                </button>
              </form>
            ) : null}
          </div>
        ))}
        {forecast.length === 0 ? <div className="p-4"><EmptyState title="Kein Forecast">Keine saisonalen wiederkehrenden Vorlagen fuer die naechsten drei Monate.</EmptyState></div> : null}
      </div>
    </AppShell>
  );
}
