import { createInviteAction } from "@/lib/gardens/invite-actions";
import { setMemberActiveAction, updateMemberRoleAction } from "@/lib/gardens/member-actions";
import { createPreparedMemberAction } from "@/lib/gardens/prepared-member-actions";
import { formatDate, todayIsoDate } from "@/lib/format/date";
import type { GardenInvite, GardenMember } from "@/types/domain";
import { Button } from "@/components/ui/button";

export function InvitePanel({
  gardenId,
  members,
  invites,
  origin,
  canManage,
  isOwner,
}: {
  gardenId: string;
  members: GardenMember[];
  invites: GardenInvite[];
  origin: string;
  canManage: boolean;
  isOwner: boolean;
}) {
  const activeMembers = members.filter((member) => member.is_active);
  const formerMembers = members.filter((member) => !member.is_active);
  const nameOf = (userId: string | null) => members.find((member) => member.user_id === userId)?.profiles?.display_name ?? "Mitglied";
  const replaceOptions = (
    <>
      <option value="">Niemanden (kommt zusaetzlich dazu)</option>
      {members.map((member) => (
        <option key={member.user_id} value={member.user_id}>
          {member.profiles?.display_name ?? "Mitglied"}{member.is_active ? "" : " (ausgezogen)"}
        </option>
      ))}
    </>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Mitglieder</h2>
        <div className="mt-3 space-y-3">
          {activeMembers.map((member) => (
            <div className={`rounded-lg p-3 ${member.is_active ? "bg-[#f2f7ec]" : "bg-[#ede7df]"}`} key={member.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-semibold">{member.profiles?.display_name ?? "Mitglied"}</div>
                <div className="truncate text-xs text-[#6d7669]">{member.user_id}</div>
                <div className="mt-1 text-xs font-semibold text-[#6d7669]">
                  seit {formatDate(member.joined_on)}
                  {member.replaces_user_id ? ` · uebernimmt Platz von ${nameOf(member.replaces_user_id)}` : ""}
                </div>
              </div>
              {canManage ? <div className="flex flex-wrap gap-2">
                <form action={updateMemberRoleAction} className="flex gap-2">
                  <input name="member_id" type="hidden" value={member.id} />
                  <input name="garden_id" type="hidden" value={gardenId} />
                  <select aria-label="Rolle" className="rounded-lg border border-[#cbd8c1] bg-white px-2 py-2 text-sm" name="role" defaultValue={member.role}>
                    <option value="member">member</option>
                    <option value="admin">admin</option>
                    {isOwner || member.role === "owner" ? <option value="owner">owner</option> : null}
                  </select>
                  <Button variant="secondary" type="submit">Rolle</Button>
                </form>
                <form action={setMemberActiveAction} className="flex gap-2">
                  <input name="member_id" type="hidden" value={member.id} />
                  <input name="garden_id" type="hidden" value={gardenId} />
                  <input name="active" type="hidden" value="false" />
                  <input
                    aria-label="Auszugsdatum"
                    className="rounded-lg border border-[#cbd8c1] bg-white px-2 py-2 text-sm"
                    defaultValue={todayIsoDate()}
                    name="left_on"
                    type="date"
                  />
                  <Button variant="ghost" type="submit">Auszug</Button>
                </form>
              </div> : (
                <span className="rounded-full bg-[#e3ecd9] px-2.5 py-1 text-xs font-semibold text-[#2f6b3f]">{member.role}</span>
              )}
              </div>
            </div>
          ))}
        </div>
        {formerMembers.length > 0 ? (
          <>
            <h3 className="mt-6 text-base font-bold">Ausgezogen</h3>
            <p className="mt-1 text-sm text-[#5a6655]">Bleiben in der Abrechnung, bis der Zeitraum abgeschlossen ist.</p>
            <div className="mt-3 space-y-3">
              {formerMembers.map((member) => {
                const successor = members.find((other) => other.replaces_user_id === member.user_id);
                return (
                  <div className="flex flex-col gap-2 rounded-lg bg-[#ede7df] p-3 sm:flex-row sm:items-center sm:justify-between" key={member.id}>
                    <div>
                      <div className="font-semibold">{member.profiles?.display_name ?? "Mitglied"}</div>
                      <div className="text-xs text-[#6d7669]">
                        {formatDate(member.joined_on)} bis {formatDate(member.left_on)}
                        {successor ? ` · Platz uebernommen von ${successor.profiles?.display_name ?? "Mitglied"}` : ""}
                      </div>
                    </div>
                    {canManage ? (
                      <form action={setMemberActiveAction}>
                        <input name="member_id" type="hidden" value={member.id} />
                        <input name="garden_id" type="hidden" value={gardenId} />
                        <input name="active" type="hidden" value="true" />
                        <Button variant="ghost" type="submit">Wieder aktivieren</Button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
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
          <label className="block text-sm font-semibold">
            Ersetzt
            <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="replaces_user_id" defaultValue="">
              {replaceOptions}
            </select>
          </label>
          <Button type="submit">Invite erstellen</Button>
        </form> : <p className="mt-3 text-sm text-[#6d7669]">Nur Owner/Admins koennen Einladungen erstellen.</p>}
        <div className="mt-5 space-y-3">
          {invites.map((invite) => (
            <div className="rounded-lg bg-[#f2f7ec] p-3" key={invite.id}>
              <div className="text-sm font-semibold">{invite.email ?? "Offener Link"}</div>
              <div className="mt-1 break-all text-xs text-[#6d7669]">{origin}/invite/{invite.token}</div>
              <div className="mt-1 text-xs text-[#6d7669]">
                Bis {formatDate(invite.expires_at)}
                {invite.replaces_user_id ? ` · ersetzt ${nameOf(invite.replaces_user_id)}` : ""}
              </div>
            </div>
          ))}
          {invites.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine offenen Einladungen.</p> : null}
        </div>
        {canManage ? (
          <form action={createPreparedMemberAction} className="mt-6 space-y-3 border-t border-[#e5ecdc] pt-5">
            <h2 className="text-lg font-bold">Person vorab anlegen</h2>
            <p className="text-sm text-[#5a6655]">
              Fuer jemanden, der noch nicht beigetreten ist. Die Person ist sofort im Plan und uebernimmt ihr Profil, sobald sie sich mit dieser E-Mail anmeldet.
            </p>
            <input name="garden_id" type="hidden" value={gardenId} />
            <label className="block text-sm font-semibold">
              Name
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="display_name" required />
            </label>
            <label className="block text-sm font-semibold">
              E-Mail
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="email" type="email" placeholder="name@example.com" required />
            </label>
            <label className="block text-sm font-semibold">
              Rolle
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="role" defaultValue="member">
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <label className="block text-sm font-semibold">
              Ersetzt
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="replaces_user_id" defaultValue="">
                {replaceOptions}
              </select>
            </label>
            <Button type="submit">Person anlegen</Button>
          </form>
        ) : null}
      </aside>
    </div>
  );
}
