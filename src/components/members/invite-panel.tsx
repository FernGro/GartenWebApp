import { createInviteAction } from "@/lib/gardens/invite-actions";
import { setMemberActiveAction, updateMemberRoleAction } from "@/lib/gardens/member-actions";
import { formatDate } from "@/lib/format/date";
import type { GardenInvite, GardenMember } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function InvitePanel({
  gardenId,
  members,
  invites,
  origin,
  canManage,
}: {
  gardenId: string;
  members: GardenMember[];
  invites: GardenInvite[];
  origin: string;
  canManage: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Mitglieder</h2>
        <div className="mt-3 space-y-3">
          {members.map((member) => (
            <div className={`rounded-lg p-3 ${member.is_active ? "bg-[#f2f7ec]" : "bg-[#ede7df]"}`} key={member.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold">{member.profiles?.display_name ?? "Mitglied"}</div>
                <div className="truncate text-xs text-[#6d7669]">{member.user_id}</div>
                <div className="mt-1 text-xs font-semibold text-[#6d7669]">{member.is_active ? "aktiv" : "deaktiviert"}</div>
              </div>
              {canManage ? <div className="flex flex-wrap gap-2">
                <form action={updateMemberRoleAction} className="flex gap-2">
                  <input name="member_id" type="hidden" value={member.id} />
                  <input name="garden_id" type="hidden" value={gardenId} />
                  <input name="current_role" type="hidden" value={member.role} />
                  <select className="rounded-lg border border-[#cbd8c1] bg-white px-2 py-2 text-sm" name="role" defaultValue={member.role}>
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    <option value="owner">owner</option>
                  </select>
                  <Button variant="secondary" type="submit">Rolle</Button>
                </form>
                <form action={setMemberActiveAction}>
                  <input name="member_id" type="hidden" value={member.id} />
                  <input name="garden_id" type="hidden" value={gardenId} />
                  <input name="current_role" type="hidden" value={member.role} />
                  <input name="active" type="hidden" value={member.is_active ? "false" : "true"} />
                  <Button variant="ghost" type="submit">{member.is_active ? "Deaktivieren" : "Aktivieren"}</Button>
                </form>
              </div> : (
                <span className="rounded-full bg-[#e3ecd9] px-2.5 py-1 text-xs font-semibold text-[#2f6b3f]">{member.role}</span>
              )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Einladung erstellen</h2>
        {canManage ? (
          <p className="mt-2 rounded-lg bg-[#fff7e8] p-3 text-sm leading-6 text-[#6f4d16]">
            Erstelle keine Einladung fuer deinen eigenen Account. Wenn du den Link selbst annimmst, wird deine Rolle nicht mehr heruntergestuft, aber der Link ist dann verbraucht.
          </p>
        ) : null}
        {canManage ? <form action={createInviteAction} className="mt-4 space-y-3">
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
        </form> : <p className="mt-3 text-sm text-[#6d7669]">Nur Owner/Admins koennen Einladungen erstellen.</p>}
        <div className="mt-5 space-y-3">
          {invites.map((invite) => (
            <div className="rounded-lg bg-[#f2f7ec] p-3" key={invite.id}>
              <div className="text-sm font-semibold">{invite.email ?? "Offener Link"}</div>
              <div className="mt-1 break-all text-xs text-[#6d7669]">{origin}/invite/{invite.token}</div>
              <div className="mt-1 text-xs text-[#6d7669]">Bis {formatDate(invite.expires_at)}</div>
            </div>
          ))}
          {invites.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine offenen Einladungen.</p> : null}
        </div>
      </aside>
    </div>
  );
}
