import { createInviteAction } from "@/lib/gardens/invite-actions";
import { setMemberActiveAction, updateMemberRoleAction } from "@/lib/gardens/member-actions";
import { createPreparedMemberAction } from "@/lib/gardens/prepared-member-actions";
import { formatDate, todayIsoDate } from "@/lib/format/date";
import type { GardenInvite, GardenMember, GardenRole } from "@/types/domain";
import { Button } from "@/components/ui/button";

const inputClass = "mt-1 w-full rounded-xl border border-[#cbd8c1] bg-white px-3 py-3";
const labelClass = "block text-sm font-semibold text-[#405039]";
const panelClass = "rounded-2xl border border-[#d7dfcf] bg-[#fffef9] shadow-[0_2px_0_#d7dfcf]";

const roleLabels: Record<GardenRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Mitglied",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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
      <option value="">Niemanden, kommt zusaetzlich dazu</option>
      {members.map((member) => (
        <option key={member.user_id} value={member.user_id}>
          {member.profiles?.display_name ?? "Mitglied"}{member.is_active ? "" : " (ausgezogen)"}
        </option>
      ))}
    </>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-2xl font-bold">Wohnt hier</h2>
          <ul className="space-y-3">
            {activeMembers.map((member) => {
              const name = member.profiles?.display_name ?? "Mitglied";
              return (
                <li className={`${panelClass} p-4`} key={member.id}>
                  <div className="flex items-center gap-3">
                    <span aria-hidden="true" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e7efe1] font-display font-bold text-[#2f6b3f]">
                      {initials(name) || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-lg font-bold">{name}</span>
                        <span className="rounded-full bg-[#e7efe1] px-2 py-0.5 text-xs font-semibold text-[#2f6b3f]">{roleLabels[member.role]}</span>
                      </div>
                      <div className="text-sm text-[#5a6655]">
                        Seit {formatDate(member.joined_on)}
                        {member.replaces_user_id ? `, uebernimmt den Platz von ${nameOf(member.replaces_user_id)}` : ""}
                      </div>
                    </div>
                  </div>
                  {canManage ? (
                    <details className="mt-3 border-t border-[#e5ecdc] pt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[#2f6b3f]">Bearbeiten</summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <form action={updateMemberRoleAction} className="space-y-2">
                          <input name="member_id" type="hidden" value={member.id} />
                          <input name="garden_id" type="hidden" value={gardenId} />
                          <label className={labelClass}>
                            Rolle
                            <select className={inputClass} defaultValue={member.role} name="role">
                              <option value="member">Mitglied</option>
                              <option value="admin">Admin</option>
                              {isOwner || member.role === "owner" ? <option value="owner">Owner</option> : null}
                            </select>
                          </label>
                          <Button type="submit" variant="secondary">Rolle speichern</Button>
                        </form>
                        <form action={setMemberActiveAction} className="space-y-2">
                          <input name="member_id" type="hidden" value={member.id} />
                          <input name="garden_id" type="hidden" value={gardenId} />
                          <input name="active" type="hidden" value="false" />
                          <label className={labelClass}>
                            Auszugsdatum
                            <input className={inputClass} defaultValue={todayIsoDate()} max={todayIsoDate()} name="left_on" type="date" />
                          </label>
                          <Button type="submit" variant="secondary">Als ausgezogen markieren</Button>
                        </form>
                      </div>
                    </details>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>

        {formerMembers.length > 0 ? (
          <section>
            <h2 className="text-2xl font-bold">Ausgezogen</h2>
            <p className="mb-3 mt-1 text-sm text-[#5a6655]">Bleiben in der Abrechnung, bis der Zeitraum abgeschlossen ist.</p>
            <ul className="space-y-2">
              {formerMembers.map((member) => {
                const successor = members.find((other) => other.replaces_user_id === member.user_id);
                return (
                  <li className="flex flex-col gap-2 rounded-2xl bg-[#ede7df] p-4 sm:flex-row sm:items-center sm:justify-between" key={member.id}>
                    <div>
                      <div className="font-semibold">{member.profiles?.display_name ?? "Mitglied"}</div>
                      <div className="text-sm text-[#6d7669]">
                        {formatDate(member.joined_on)} bis {formatDate(member.left_on)}
                        {successor ? `, Platz uebernommen von ${successor.profiles?.display_name ?? "Mitglied"}` : ""}
                      </div>
                    </div>
                    {canManage ? (
                      <form action={setMemberActiveAction}>
                        <input name="member_id" type="hidden" value={member.id} />
                        <input name="garden_id" type="hidden" value={gardenId} />
                        <input name="active" type="hidden" value="true" />
                        <Button type="submit" variant="ghost">Wieder aktivieren</Button>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="space-y-4">
        <h2 className="text-2xl font-bold">Neue Person</h2>
        {canManage ? (
          <>
            <details className={`${panelClass} p-4`} open>
              <summary className="cursor-pointer text-lg font-bold">Per Einladungslink</summary>
              <p className="mt-2 text-sm text-[#5a6655]">Die Person oeffnet den Link, meldet sich an und ist dabei. Nicht fuer dein eigenes Konto verwenden.</p>
              <form action={createInviteAction} className="mt-4 space-y-3">
                <input name="garden_id" type="hidden" value={gardenId} />
                <label className={labelClass}>
                  Ersetzt
                  <select className={inputClass} defaultValue="" name="replaces_user_id">
                    {replaceOptions}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={labelClass}>
                    Rolle
                    <select className={inputClass} defaultValue="member" name="role">
                      <option value="member">Mitglied</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    E-Mail (optional)
                    <input className={inputClass} name="email" placeholder="name@example.com" type="email" />
                  </label>
                </div>
                <Button className="w-full" type="submit">Link erstellen</Button>
              </form>
            </details>

            <details className={`${panelClass} p-4`}>
              <summary className="cursor-pointer text-lg font-bold">Vorab anlegen</summary>
              <p className="mt-2 text-sm text-[#5a6655]">
                Fuer jemanden, der noch nicht beigetreten ist. Die Person bekommt sofort Dienste und uebernimmt ihr Profil, sobald sie sich mit dieser E-Mail anmeldet.
              </p>
              <form action={createPreparedMemberAction} className="mt-4 space-y-3">
                <input name="garden_id" type="hidden" value={gardenId} />
                <label className={labelClass}>
                  Name
                  <input className={inputClass} name="display_name" required />
                </label>
                <label className={labelClass}>
                  E-Mail
                  <input className={inputClass} name="email" placeholder="name@example.com" required type="email" />
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={labelClass}>
                    Rolle
                    <select className={inputClass} defaultValue="member" name="role">
                      <option value="member">Mitglied</option>
                      <option value="admin">Admin</option>
                    </select>
                  </label>
                  <label className={labelClass}>
                    Ersetzt
                    <select className={inputClass} defaultValue="" name="replaces_user_id">
                      {replaceOptions}
                    </select>
                  </label>
                </div>
                <Button className="w-full" type="submit">Person anlegen</Button>
              </form>
            </details>

            <section className={`${panelClass} p-4`}>
              <h3 className="text-lg font-bold">Offene Einladungen</h3>
              <ul className="mt-3 space-y-2">
                {invites.map((invite) => (
                  <li className="rounded-xl bg-[#f2f7ec] p-3" key={invite.id}>
                    <div className="text-sm font-semibold">
                      {invite.email ?? "Link ohne E-Mail"}
                      {invite.replaces_user_id ? `, ersetzt ${nameOf(invite.replaces_user_id)}` : ""}
                    </div>
                    <input
                      aria-label="Einladungslink"
                      className="mt-2 w-full select-all rounded-lg border border-[#d7dfcf] bg-white px-2 py-1.5 text-xs text-[#405039]"
                      readOnly
                      value={`${origin}/invite/${invite.token}`}
                    />
                    <div className="mt-1 text-xs text-[#6d7669]">Gueltig bis {formatDate(invite.expires_at)}</div>
                  </li>
                ))}
                {invites.length === 0 ? <li className="text-sm text-[#6d7669]">Keine offenen Einladungen.</li> : null}
              </ul>
            </section>
          </>
        ) : (
          <p className={`${panelClass} p-4 text-sm text-[#5a6655]`}>Neue Personen koennen nur Owner und Admins einladen.</p>
        )}
      </aside>
    </div>
  );
}
