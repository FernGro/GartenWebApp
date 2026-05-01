import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format/date";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { markNotificationReadAction } from "@/lib/notifications/actions";
import { getNotifications } from "@/lib/notifications/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const notifications = supabase && garden ? await getNotifications(supabase, garden.id) : [];

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Meldungen</h1>
      <div className="grid gap-3">
        {notifications.map((notification) => (
          <article className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5" key={notification.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{notification.title}</h2>
                  {!notification.read_at ? (
                    <span className="rounded-full bg-[#f4efe1] px-2 py-1 text-xs font-semibold text-[#915b10]">Neu</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-[#42513d]">{notification.message}</p>
                <p className="mt-2 text-xs text-[#6d7669]">{formatDateTime(notification.created_at)}</p>
              </div>
              <div className="flex gap-2">
                {notification.related_task_id ? (
                  <Link href={`/tasks/${notification.related_task_id}`}>
                    <Button variant="secondary">Aufgabe</Button>
                  </Link>
                ) : null}
                {!notification.read_at ? (
                  <form action={markNotificationReadAction}>
                    <input name="id" type="hidden" value={notification.id} />
                    <Button variant="ghost" type="submit">Gelesen</Button>
                  </form>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {notifications.length === 0 ? (
          <EmptyState title="Noch keine Meldungen">Zuweisungen und spaetere Erinnerungen erscheinen hier.</EmptyState>
        ) : null}
      </div>
    </AppShell>
  );
}
