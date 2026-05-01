import { headers } from "next/headers";
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
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const protocol = headerStore.get("x-forwarded-proto") ?? "http";
  const origin = `${protocol}://${host}`;
  const [members, invites] = supabase && garden
    ? await Promise.all([getGardenMembers(supabase, garden.id, true), getGardenInvites(supabase, garden.id)])
    : [[], []];
  const myMembership = members.find((member) => member.user_id === user?.id && member.is_active);
  const canManage = myMembership?.role === "owner" || myMembership?.role === "admin";

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-bold">Mitglieder</h1>
      {garden ? (
        <InvitePanel gardenId={garden.id} members={members} invites={invites} origin={origin} canManage={canManage} />
      ) : (
        <EmptyState title="Kein Garten">Lege zuerst einen Garten im Dashboard an.</EmptyState>
      )}
    </AppShell>
  );
}
