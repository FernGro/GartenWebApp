import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createMemberAdjustmentAction } from "@/lib/adjustments/actions";
import { closeBillingPeriodAction, createTransactionAction, updateBillingSettingsAction } from "@/lib/billing/actions";
import { calculateSettlementSuggestions, type SettlementSuggestion } from "@/lib/billing/queries";
import { getCurrentTeamBilling } from "@/lib/billing/team-queries";
import { formatDate, todayIsoDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createClient } from "@/lib/supabase/server";
import type { GardenMember } from "@/types/domain";
import { ActionForm } from "@/components/ui/action-form";

export const dynamic = "force-dynamic";

const inputClass = "mt-1 w-full rounded-xl border border-[#cbd8c1] bg-white px-3 py-3";
const labelClass = "block text-sm font-semibold text-[#405039]";
const panelClass = "rounded-2xl border border-[#d7dfcf] bg-[#fffef9] shadow-[0_2px_0_#d7dfcf]";

function memberLabel(member: GardenMember) {
  const name = member.profiles?.display_name ?? "Mitglied";
  return member.is_active ? name : `${name} (ausgezogen)`;
}

function snapshotSettlements(snapshot: unknown): SettlementSuggestion[] {
  if (!snapshot || typeof snapshot !== "object" || !("settlements" in snapshot)) {
    return [];
  }

  const settlements = (snapshot as { settlements: unknown }).settlements;
  return Array.isArray(settlements) ? (settlements as SettlementSuggestion[]) : [];
}

function Settlement({ settlement, currentUserId }: { settlement: SettlementSuggestion; currentUserId?: string }) {
  const from = settlement.fromUserId === currentUserId ? "Du" : settlement.fromName;
  const to = settlement.toUserId === currentUserId ? "dich" : settlement.toName;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f2f7ec] px-3 py-2.5 text-sm">
      <span>
        <span className="font-semibold">{from}</span> {from === "Du" ? "zahlst" : "zahlt"} an <span className="font-semibold">{to}</span>
      </span>
      <span className="font-display text-lg font-bold tabular-nums text-[#2f6b3f]">{formatMoney(settlement.amountCents)}</span>
    </div>
  );
}

export default async function BillingPage() {
  const supabase = await createClient();
  const garden = supabase ? await getCurrentGarden(supabase) : null;

  if (!supabase || !garden) {
    return (
      <AppShell>
        <EmptyState title="Kein Garten">Lege zuerst einen Garten an oder nimm eine Einladung an.</EmptyState>
      </AppShell>
    );
  }

  const user = (await supabase.auth.getUser()).data.user;
  const [{ billing, range, members, transactions, adjustments, settings, closedPeriods }, role] = await Promise.all([
    getCurrentTeamBilling(supabase, garden.id),
    user ? getUserGardenRole(supabase, garden.id, user.id) : Promise.resolve(null),
  ]);
  const canManage = canManageGarden(role);
  const settlements = calculateSettlementSuggestions(billing.rows);
  const mySettlements = settlements.filter((item) => item.fromUserId === user?.id || item.toUserId === user?.id);
  const otherSettlements = settlements.filter((item) => !mySettlements.includes(item));
  const myRow = billing.rows.find((row) => row.userId === user?.id);
  const periodAdjustments = adjustments.filter((adjustment) => todayIsoDate(new Date(adjustment.created_at)) >= range.startsOn);
  const maxSlotValue = Math.max(1, ...billing.slots.map((slot) => Math.max(slot.contributionCents, slot.fairShareCents)));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Abrechnung</h1>
        <p className="mt-1 text-[#5a6655]">Laufender Zeitraum seit {formatDate(range.startsOn)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl bg-[#2f6b3f] p-5 text-white shadow-[0_3px_0_#1f4a2b] sm:p-7">
            <div aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.06)_0_56px,transparent_56px_112px)]" />
            <div className="relative">
              <h2 className="text-lg font-semibold text-[#dcebcf]">Dein Stand</h2>
              {myRow ? (
                <>
                  <p className="mt-1 font-display text-4xl font-bold tabular-nums sm:text-5xl">
                    {myRow.balanceCents > 0
                      ? `+${formatMoney(myRow.balanceCents)}`
                      : myRow.balanceCents < 0
                        ? formatMoney(myRow.balanceCents)
                        : "Ausgeglichen"}
                  </p>
                  <p className="mt-1 text-[#dcebcf]">
                    {myRow.balanceCents > 0
                      ? "Du hast mehr beigetragen als dein Anteil und bekommst Geld zurueck."
                      : myRow.balanceCents < 0
                        ? "Du liegst unter deinem Anteil und zahlst beim Ausgleich."
                        : "Du bist genau bei deinem Anteil."}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-[#dcebcf]">Du bist in diesem Zeitraum nicht in der Abrechnung.</p>
              )}
              {mySettlements.length > 0 ? (
                <div className="mt-4 space-y-2 text-[#172016]">
                  {mySettlements.map((settlement) => (
                    <Settlement currentUserId={user?.id} key={`${settlement.fromUserId}-${settlement.toUserId}`} settlement={settlement} />
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="text-2xl font-bold">Plaetze im Haushalt</h2>
              <span className="text-sm text-[#5a6655]">Gesamt {formatMoney(billing.potCents)}</span>
            </div>
            <p className="mb-4 max-w-2xl text-sm text-[#5a6655]">
              Wer jemanden ersetzt, bildet mit ihm ein Team. Liegt ein Team unter seinem Soll, wird das Minus nach Anwesenheit geteilt, ein Plus nach eigenem Beitrag.
            </p>
            <div className="space-y-3">
              {billing.slots.map((slot) => {
                const contribution = Math.max(0, Math.round((slot.contributionCents / maxSlotValue) * 100));
                const target = Math.round((slot.fairShareCents / maxSlotValue) * 100);
                return (
                  <article className={`${panelClass} overflow-hidden`} key={slot.slotId}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-bold">
                          {slot.members.map((row) => row.displayName).join(" + ")}
                        </h3>
                        <span className={`shrink-0 font-display text-lg font-bold tabular-nums ${slot.teamBalanceCents >= 0 ? "text-[#2f6b3f]" : "text-[#915b10]"}`}>
                          {slot.teamBalanceCents > 0 ? "+" : ""}
                          {formatMoney(slot.teamBalanceCents)}
                        </span>
                      </div>
                      <div aria-hidden="true" className="relative mt-3 h-3 rounded-full bg-[#e7efe1]">
                        <div
                          className={`h-3 rounded-full ${slot.contributionCents >= slot.fairShareCents ? "bg-[#4d9350]" : "bg-[#d2a24c]"}`}
                          style={{ width: `${contribution}%` }}
                        />
                        <div className="absolute -top-1 h-5 w-0.5 rounded bg-[#172016]" style={{ left: `${target}%` }} />
                      </div>
                      <div className="mt-2 flex justify-between text-xs text-[#5a6655]">
                        <span>Beitrag {formatMoney(slot.contributionCents)}</span>
                        <span>Soll {formatMoney(slot.fairShareCents)}</span>
                      </div>
                    </div>
                    {slot.members.length > 1 || slot.members.some((row) => row.transferCents !== 0) ? (
                      <div className="divide-y divide-[#e5ecdc] border-t border-[#e5ecdc] bg-[#f8faf3]">
                        {slot.members.map((row) => (
                          <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm" key={row.userId}>
                            <div className="min-w-0">
                              <div className="font-semibold">{row.displayName}</div>
                              <div className="text-xs text-[#6d7669]">
                                {row.isActive ? "wohnt hier" : `ausgezogen am ${formatDate(row.leftOn)}`}, {row.presenceDays} Tage im Zeitraum
                                {row.transferCents !== 0 ? `, Zahlungen ${formatMoney(row.transferCents)}` : ""}
                              </div>
                            </div>
                            <span className={`shrink-0 font-bold tabular-nums ${row.balanceCents >= 0 ? "text-[#2f6b3f]" : "text-[#915b10]"}`}>
                              {formatMoney(row.balanceCents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {billing.slots.length === 0 ? <EmptyState title="Noch keine Eintraege">Im aktuellen Zeitraum gibt es noch nichts abzurechnen.</EmptyState> : null}
            </div>
          </section>

          {otherSettlements.length > 0 ? (
            <section className={`${panelClass} p-4`}>
              <h2 className="text-lg font-bold">Weitere Ausgleichszahlungen</h2>
              <div className="mt-3 space-y-2">
                {otherSettlements.map((settlement) => (
                  <Settlement currentUserId={user?.id} key={`${settlement.fromUserId}-${settlement.toUserId}`} settlement={settlement} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <details className={`${panelClass} p-4`} open>
            <summary className="cursor-pointer text-lg font-bold">Ausgabe oder Zahlung eintragen</summary>
            <ActionForm action={createTransactionAction} className="mt-4 space-y-3">
              <input name="garden_id" type="hidden" value={garden.id} />
              <fieldset>
                <legend className={labelClass}>Was ist passiert?</legend>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <label className="press flex cursor-pointer items-center justify-center rounded-xl border border-[#cbd8c1] bg-white px-3 py-3 text-center text-sm font-semibold has-[:checked]:border-[#2f6b3f] has-[:checked]:bg-[#e7efe1] has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-[#8fb36b]">
                    <input className="sr-only" defaultChecked name="type" type="radio" value="expense" />
                    Ausgabe
                  </label>
                  <label className="press flex cursor-pointer items-center justify-center rounded-xl border border-[#cbd8c1] bg-white px-3 py-3 text-center text-sm font-semibold has-[:checked]:border-[#2f6b3f] has-[:checked]:bg-[#e7efe1] has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-[#8fb36b]">
                    <input className="sr-only" name="type" type="radio" value="payment" />
                    Zahlung an jemanden
                  </label>
                </div>
              </fieldset>
              <label className={labelClass}>
                Wofuer
                <input className={inputClass} name="title" placeholder="z. B. Benzin fuer den Rasenmaeher" required />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>
                  Betrag in EUR
                  <input className={inputClass} inputMode="decimal" name="amount" placeholder="30,00" required />
                </label>
                <label className={labelClass}>
                  Datum
                  <input className={inputClass} defaultValue={todayIsoDate()} name="occurred_on" type="date" />
                </label>
              </div>
              <label className={labelClass}>
                Bezahlt von
                <select className={inputClass} defaultValue={user?.id} name="paid_by">
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Empfaenger (nur bei Zahlung)
                <select className={inputClass} name="paid_to">
                  <option value="">Niemand</option>
                  {members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Notiz (optional)
                <input className={inputClass} name="note" />
              </label>
              <Button className="w-full" type="submit">Eintragen</Button>
            </ActionForm>
          </details>

          <details className={`${panelClass} p-4`}>
            <summary className="cursor-pointer text-lg font-bold">Verlauf in diesem Zeitraum</summary>
            <div className="mt-3 space-y-2">
              {transactions.map((transaction) => (
                <div className="rounded-xl bg-[#f2f7ec] px-3 py-2.5 text-sm" key={transaction.id}>
                  <div className="flex justify-between gap-3 font-semibold">
                    <span className="truncate">{transaction.title}</span>
                    <span className="tabular-nums">{formatMoney(transaction.amount_cents)}</span>
                  </div>
                  <div className="text-xs text-[#6d7669]">
                    {transaction.type === "payment" ? "Zahlung" : "Ausgabe"} am {formatDate(transaction.occurred_on)} von {transaction.paid_by_profile?.display_name ?? "Mitglied"}
                    {transaction.paid_to_profile ? ` an ${transaction.paid_to_profile.display_name}` : ""}
                  </div>
                </div>
              ))}
              {periodAdjustments.map((adjustment) => (
                <div className="rounded-xl bg-[#f4efe1] px-3 py-2.5 text-sm" key={adjustment.id}>
                  <div className="font-semibold">Korrektur fuer {adjustment.profiles?.display_name ?? "Mitglied"}</div>
                  <div className="text-xs text-[#6d7669]">
                    {adjustment.reason}: {adjustment.points_delta} Punkte, {formatMoney(adjustment.amount_cents_delta)}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && periodAdjustments.length === 0 ? (
                <p className="text-sm text-[#6d7669]">Noch keine Ausgaben, Zahlungen oder Korrekturen.</p>
              ) : null}
            </div>
          </details>

          {closedPeriods.length > 0 ? (
            <details className={`${panelClass} p-4`}>
              <summary className="cursor-pointer text-lg font-bold">Fruehere Abrechnungen</summary>
              <div className="mt-3 space-y-3">
                {closedPeriods.map((period) => {
                  const archived = snapshotSettlements(period.snapshot);
                  return (
                    <div key={period.id}>
                      <div className="text-sm font-semibold text-[#405039]">
                        {formatDate(period.starts_on)} bis {formatDate(period.ends_on)}
                      </div>
                      <div className="mt-1 space-y-1.5">
                        {archived.map((settlement) => (
                          <Settlement currentUserId={user?.id} key={`${period.id}-${settlement.fromUserId}-${settlement.toUserId}`} settlement={settlement} />
                        ))}
                        {archived.length === 0 ? <div className="text-sm text-[#6d7669]">Nichts auszugleichen.</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}

          {canManage ? (
            <details className={`${panelClass} p-4`}>
              <summary className="cursor-pointer text-lg font-bold">Verwaltung</summary>
              <div className="mt-4 space-y-6">
                <ActionForm action={updateBillingSettingsAction} className="space-y-3">
                  <h3 className="font-bold">Wert eines Punktes</h3>
                  <input name="garden_id" type="hidden" value={garden.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <label className={labelClass}>
                      Stundenlohn EUR
                      <input className={inputClass} defaultValue={(settings.hourly_rate_cents / 100).toFixed(2)} inputMode="decimal" name="hourly_rate" />
                    </label>
                    <label className={labelClass}>
                      Stunden pro Punkt
                      <input className={inputClass} defaultValue={settings.point_hours} inputMode="decimal" name="point_hours" />
                    </label>
                  </div>
                  <Button type="submit" variant="secondary">Speichern</Button>
                </ActionForm>

                <ActionForm action={createMemberAdjustmentAction} className="space-y-3 border-t border-[#e5ecdc] pt-5">
                  <h3 className="font-bold">Korrektur eintragen</h3>
                  <input name="garden_id" type="hidden" value={garden.id} />
                  <label className={labelClass}>
                    Fuer
                    <select className={inputClass} name="user_id">
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={labelClass}>
                      Punkte +/-
                      <input className={inputClass} defaultValue="0" inputMode="numeric" name="points_delta" />
                    </label>
                    <label className={labelClass}>
                      Betrag EUR +/-
                      <input className={inputClass} defaultValue="0" inputMode="decimal" name="amount_delta" />
                    </label>
                  </div>
                  <label className={labelClass}>
                    Grund
                    <input className={inputClass} name="reason" placeholder="z. B. Startwert beim Einzug" required />
                  </label>
                  <Button type="submit" variant="secondary">Korrektur eintragen</Button>
                </ActionForm>

                <ActionForm action={closeBillingPeriodAction} className="space-y-3 rounded-xl border border-[#efc071] bg-[#fff7e8] p-4 text-[#6f4d16]">
                  <h3 className="font-bold">Abrechnung abschliessen</h3>
                  <p className="text-sm">Speichert das Ergebnis bis gestern im Archiv. Ab heute laeuft ein neuer Zeitraum. Das laesst sich nicht rueckgaengig machen.</p>
                  <input name="garden_id" type="hidden" value={garden.id} />
                  <label className="block text-sm font-semibold">
                    Zur Bestaetigung ABSCHLIESSEN eintippen
                    <input autoComplete="off" className="mt-1 w-full rounded-xl border border-[#efc071] bg-white px-3 py-3" name="confirm" required />
                  </label>
                  <Button type="submit">Abrechnung abschliessen</Button>
                </ActionForm>
              </div>
            </details>
          ) : null}
        </aside>
      </div>
    </AppShell>
  );
}
