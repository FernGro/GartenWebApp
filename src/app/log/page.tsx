import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/format/date";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createClient } from "@/lib/supabase/server";
import { getGardenTaskEvents } from "@/lib/tasks/event-log";

export const dynamic = "force-dynamic";

export default async function LogPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const role = supabase && garden && user ? await getUserGardenRole(supabase, garden.id, user.id) : null;
  const canManage = canManageGarden(role);
  const events = supabase && garden && canManage ? await getGardenTaskEvents(supabase, garden.id) : [];

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
        <div className="overflow-hidden rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5">
          {events.map((event) => (
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
          {events.length === 0 ? <div className="p-4"><EmptyState title="Noch keine Events">Sobald Aufgaben bearbeitet werden, erscheint hier der Verlauf.</EmptyState></div> : null}
        </div>
      )}
    </AppShell>
  );
}
