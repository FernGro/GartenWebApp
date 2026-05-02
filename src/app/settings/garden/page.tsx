import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { GardenSettingsPanel } from "@/components/settings/garden-settings-panel";
import { NotificationContactPanel } from "@/components/settings/notification-contact-panel";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvailability } from "@/lib/availability/queries";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { getNotificationContact } from "@/lib/notifications/contacts";
import { createClient } from "@/lib/supabase/server";
import type { GardenRole } from "@/types/domain";

export const dynamic = "force-dynamic";

export default async function GardenSettingsPage({
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
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const profile = supabase && user
    ? (await supabase.from("profiles").select("id,display_name").eq("id", user.id).maybeSingle()).data
    : null;
  const membership = supabase && garden && user
    ? (await supabase
        .from("garden_members")
        .select("role")
        .eq("garden_id", garden.id)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle()).data
    : null;
  const userRole: GardenRole = (membership?.role as GardenRole) ?? "member";
  const availability = supabase && garden ? await getAvailability(supabase, garden.id) : [];
  const contact = supabase && garden && user ? await getNotificationContact(supabase, garden.id, user.id) : null;

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Garten</h1>
      {garden ? (
        <>
          <GardenSettingsPanel garden={garden} profile={profile} userRole={userRole} />
          <NotificationContactPanel gardenId={garden.id} contact={contact} />
          <AvailabilityCalendar gardenId={garden.id} entries={availability} year={year} month={month} />
        </>
      ) : (
        <EmptyState title="Kein Garten">Lege zuerst einen Garten im Dashboard an.</EmptyState>
      )}
    </AppShell>
  );
}
