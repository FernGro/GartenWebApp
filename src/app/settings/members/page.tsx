import { InvitePanel } from "@/components/members/invite-panel";
import { AppShell } from "@/components/layout/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { getGardenInvites } from "@/lib/gardens/invites";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MembersSettingsPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;
  const [members, invites] = supabase && garden
    ? await Promise.all([getGardenMembers(supabase, garden.id), getGardenInvites(supabase, garden.id)])
    : [[], []];

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Mitglieder</h1>
      {garden ? (
        <InvitePanel gardenId={garden.id} members={members} invites={invites} />
      ) : (
        <EmptyState title="Kein Garten">Lege zuerst einen Garten im Dashboard an.</EmptyState>
      )}
    </AppShell>
  );
}
