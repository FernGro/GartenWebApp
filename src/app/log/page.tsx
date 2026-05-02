import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format/date";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createClient } from "@/lib/supabase/server";
import { getGardenTaskEvents } from "@/lib/tasks/event-log";

export const dynamic = "force-dynamic";

export default async function LogPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const role = supabase && garden && user ? await getUserGardenRole(supabase, garden.id, user.id) : null;
  const canManage = canManageGarden(role);
  const events = supabase && garden && canManage ? await getGardenTaskEvents(supabase, garden.id) : [];
  const eventFilter = params.event ?? "";
  const query = (params.q ?? "").trim().toLowerCase();
  const filteredEvents = events.filter((event) => {
    const matchesEvent = !eventFilter || event.event_type === eventFilter;
    const haystack = [event.actor_profile?.display_name, event.tasks?.title, event.note, event.event_type]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return matchesEvent && (!query || haystack.includes(query));
  });

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">{garden?.name ?? "Kein Garten"}</p>
        <h1 className="text-3xl font-bold">Aktivitaetslog</h1>
        <p className="mt-2 text-sm text-[#5a6655]">Owner/Admins sehen hier, wer Aufgaben erstellt, uebernommen, erledigt oder geaendert hat.</p>
      </div>
      {!canManage ? (
        <EmptyState title="Keine Berechtigung">Nur Owner/Admins koennen den zentralen Log sehen.</EmptyState>
      ) : (
        <div className="space-y-4">
          <form className="grid gap-3 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5 sm:grid-cols-[1fr_220px_auto]">
            <input
              className="rounded-lg border border-[#cbd8c1] px-3 py-3"
              defaultValue={params.q ?? ""}
              name="q"
              placeholder="Person, Aufgabe, Notiz suchen"
            />
            <select className="rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" defaultValue={eventFilter} name="event">
              <option value="">Alle Events</option>
              {["created", "assigned", "reassigned", "accepted", "completed", "reopened", "postponed", "cancelled", "commented"].map((eventType) => (
                <option key={eventType} value={eventType}>{eventType}</option>
              ))}
            </select>
            <button className="rounded-lg bg-[#2f6b3f] px-4 py-3 font-semibold text-white" type="submit">Filtern</button>
          </form>
          <div className="overflow-hidden rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5">
            {filteredEvents.map((event) => (
              <div className="grid gap-2 border-b border-[#e5ecdc] p-4 text-sm sm:grid-cols-[180px_1fr_auto]" key={event.id}>
                <div className="font-semibold text-[#42513d]">{formatDateTime(event.created_at)}</div>
                <div>
                  <div className="font-bold">{event.actor_profile?.display_name ?? "System"}: {event.event_type}</div>
                  <div className="text-[#5a6655]">{event.tasks?.title ?? "Aufgabe"}</div>
                  {event.note ? <div className="mt-1 text-xs text-[#6d7669]">{event.note}</div> : null}
                </div>
                {event.task_id ? (
                  <Link className="text-sm font-semibold text-[#2f6b3f] underline" href={`/tasks/${event.task_id}`}>
                    Aufgabe
                  </Link>
                ) : (
                  <span className="text-sm text-[#6d7669]">Geloescht</span>
                )}
              </div>
            ))}
            {filteredEvents.length === 0 ? <div className="p-4"><EmptyState title="Keine passenden Events">Passe die Filter an oder pruefe spaeter erneut.</EmptyState></div> : null}
          </div>
        </div>
      )}
    </AppShell>
  );
}
