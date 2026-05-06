import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { getCadenceRule } from "@/lib/planning/cadence";
import { isTemplateInSeason } from "@/lib/planning/fairness";
import { createClient } from "@/lib/supabase/server";
import { createTaskTemplateAction, generateSeasonalTasksAction, updateTaskTemplateScheduleAction } from "@/lib/templates/actions";
import { getTaskTemplates } from "@/lib/tasks/queries";
import { TaskIcon } from "@/components/tasks/task-icon";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const role = supabase && garden && user ? await getUserGardenRole(supabase, garden.id, user.id) : null;
  const canManage = canManageGarden(role);
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
      {garden && canManage ? (
        <form action={createTaskTemplateAction} className="mb-5 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
          <input name="garden_id" type="hidden" value={garden.id} />
          <h2 className="text-lg font-bold">Eigene Vorlage anlegen</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold">
              Titel
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="title" placeholder="z. B. Winterdienst" required />
            </label>
            <label className="text-sm font-semibold">
              Punkte
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="default_points" defaultValue="2">
                {[1, 2, 3, 4, 5].map((point) => <option key={point} value={point}>{point}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Minuten
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="estimated_minutes" type="number" defaultValue="30" min="1" required />
            </label>
            <label className="text-sm font-semibold">
              Intervall Tage
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="custom_interval_days" type="number" defaultValue="14" min="1" required />
            </label>
            <label className="text-sm font-semibold">
              Start Monat
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="season_start_month" type="number" defaultValue="4" min="1" max="12" required />
            </label>
            <label className="text-sm font-semibold">
              Start Tag
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="season_start_day" type="number" defaultValue="1" min="1" max="31" required />
            </label>
            <label className="text-sm font-semibold">
              Ende Monat
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="season_end_month" type="number" defaultValue="9" min="1" max="12" required />
            </label>
            <label className="text-sm font-semibold">
              Ende Tag
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="season_end_day" type="number" defaultValue="30" min="1" max="31" required />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm font-semibold">
            <input name="is_weather_dependent" type="checkbox" />
            wetterabhaengig
          </label>
          <Button className="mt-4" type="submit">Vorlage speichern</Button>
        </form>
      ) : null}

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
                  {template.estimated_minutes} Minuten, {getCadenceRule(template).label}
                  <br />
                  Saison {template.season_start_day}.{template.season_start_month}. bis {template.season_end_day}.{template.season_end_month}.
                </p>
                <p className="mt-2 text-sm font-semibold text-[#42513d]">
                  {isTemplateInSeason(month, template.season_start_month, template.season_end_month) ? "Aktuell in Saison" : "Aktuell ausser Saison"}
                </p>
              </div>
            </div>
            {garden && canManage && template.garden_id === garden.id ? (
              <form action={updateTaskTemplateScheduleAction} className="mt-4 grid gap-3 border-t border-[#e5ecdc] pt-4 sm:grid-cols-3">
                <input name="garden_id" type="hidden" value={garden.id} />
                <input name="template_id" type="hidden" value={template.id} />
                <label className="text-sm font-semibold">
                  alle x Tage
                  <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-2" name="custom_interval_days" type="number" defaultValue={template.custom_interval_days ?? getCadenceRule(template).intervalDays} min="1" />
                </label>
                <label className="text-sm font-semibold">
                  Start M/T
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input className="rounded-lg border border-[#cbd8c1] px-3 py-2" name="season_start_month" type="number" defaultValue={template.season_start_month} min="1" max="12" />
                    <input className="rounded-lg border border-[#cbd8c1] px-3 py-2" name="season_start_day" type="number" defaultValue={template.season_start_day} min="1" max="31" />
                  </div>
                </label>
                <label className="text-sm font-semibold">
                  Ende M/T
                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <input className="rounded-lg border border-[#cbd8c1] px-3 py-2" name="season_end_month" type="number" defaultValue={template.season_end_month} min="1" max="12" />
                    <input className="rounded-lg border border-[#cbd8c1] px-3 py-2" name="season_end_day" type="number" defaultValue={template.season_end_day} min="1" max="31" />
                  </div>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input name="is_active" type="checkbox" defaultChecked={template.is_active} />
                  aktiv
                </label>
                <Button className="sm:col-span-2" variant="secondary" type="submit">Zeitplan speichern</Button>
              </form>
            ) : null}
          </article>
        ))}
        {templates.length === 0 ? <EmptyState title="Keine Vorlagen">Fuehre den Seed aus oder lege spaeter Gartenvorlagen an.</EmptyState> : null}
      </div>
    </AppShell>
  );
}
