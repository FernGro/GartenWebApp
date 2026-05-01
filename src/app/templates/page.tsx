import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { isTemplateInSeason } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { generateSeasonalTasksAction } from "@/lib/templates/actions";
import { getTaskTemplates } from "@/lib/tasks/queries";
import { TaskIcon } from "@/components/tasks/task-icon";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const templates = supabase && garden ? await getTaskTemplates(supabase, garden.id) : [];
  const month = new Date().getMonth() + 1;

  return (
    <AppShell>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vorlagen</h1>
          <p className="mt-1 text-sm text-[#5a6655]">Saisonale Aufgaben ohne Hardcoding im UI.</p>
        </div>
        {garden ? (
          <form action={generateSeasonalTasksAction}>
            <input name="garden_id" type="hidden" value={garden.id} />
            <Button type="submit">Saisonaufgaben erzeugen</Button>
          </form>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <article className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5" key={template.id}>
            <div className="flex items-start gap-3">
              <TaskIcon title={template.title} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-bold">{template.title}</h2>
                  <span className="rounded-full bg-[#e7efe1] px-2.5 py-1 text-xs font-semibold text-[#2f6b3f]">
                    {template.default_points} Punkte
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#5a6655]">
                  {template.estimated_minutes} Minuten, Monat {template.season_start_month}-{template.season_end_month}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#42513d]">
                  {isTemplateInSeason(month, template.season_start_month, template.season_end_month) ? "Aktuell in Saison" : "Aktuell ausser Saison"}
                </p>
              </div>
            </div>
          </article>
        ))}
        {templates.length === 0 ? <EmptyState title="Keine Vorlagen">Fuehre den Seed aus oder lege spaeter Gartenvorlagen an.</EmptyState> : null}
      </div>
    </AppShell>
  );
}
