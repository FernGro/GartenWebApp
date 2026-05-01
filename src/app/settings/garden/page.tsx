import { AvailabilityCalendar } from "@/components/availability/availability-calendar";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getAvailability } from "@/lib/availability/queries";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GardenSettingsPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const availability = supabase && garden ? await getAvailability(supabase, garden.id) : [];

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Garten</h1>
      {garden ? (
        <AvailabilityCalendar gardenId={garden.id} entries={availability} />
      ) : (
        <EmptyState title="Kein Garten">Lege zuerst einen Garten im Dashboard an.</EmptyState>
      )}
    </AppShell>
  );
}
