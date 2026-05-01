import { createInviteAction } from "@/lib/gardens/invite-actions";
import { formatDate } from "@/lib/format/date";
import type { GardenInvite, GardenMember } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function InvitePanel({
  gardenId,
  members,
  invites,
}: {
  gardenId: string;
  members: GardenMember[];
  invites: GardenInvite[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Mitglieder</h2>
        <div className="mt-3 space-y-3">
          {members.map((member) => (
            <div className="flex items-center justify-between rounded-lg bg-[#f2f7ec] p-3" key={member.id}>
              <div>
                <div className="font-semibold">{member.profiles?.display_name ?? "Mitglied"}</div>
                <div className="text-xs text-[#6d7669]">{member.user_id}</div>
              </div>
              <span className="rounded-full bg-[#e3ecd9] px-2.5 py-1 text-xs font-semibold text-[#2f6b3f]">{member.role}</span>
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Einladung erstellen</h2>
        <form action={createInviteAction} className="mt-4 space-y-3">
          <input name="garden_id" type="hidden" value={gardenId} />
          <label className="text-sm font-semibold">
            E-Mail optional
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="email" placeholder="name@example.com" type="email" />
          </label>
          <label className="text-sm font-semibold">
            Rolle
            <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="role" defaultValue="member">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <Button type="submit">Invite erstellen</Button>
        </form>
        <div className="mt-5 space-y-3">
          {invites.map((invite) => (
            <div className="rounded-lg bg-[#f2f7ec] p-3" key={invite.id}>
              <div className="text-sm font-semibold">{invite.email ?? "Offener Link"}</div>
              <div className="mt-1 break-all text-xs text-[#6d7669]">/invite/{invite.token}</div>
              <div className="mt-1 text-xs text-[#6d7669]">Bis {formatDate(invite.expires_at)}</div>
            </div>
          ))}
          {invites.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine offenen Einladungen.</p> : null}
        </div>
      </aside>
    </div>
  );
}
