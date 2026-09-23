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

export const dynamic = "force-dynamic";

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
  const periodAdjustments = adjustments.filter((adjustment) => todayIsoDate(new Date(adjustment.created_at)) >= range.startsOn);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">{garden.name}</p>
        <h1 className="text-3xl font-bold">Abrechnung</h1>
        <p className="mt-2 text-sm text-[#5a6655]">
          Zeitraum seit {formatDate(range.startsOn)}. Punkte werden als Arbeitszeit bewertet. Wer jemanden ersetzt, bildet mit ihm ein Team:
          Ein Minus wird nach Anwesenheit geteilt, ein Plus nach eigenem Beitrag.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          {canManage ? (
          <form action={updateBillingSettingsAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Parameter</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-3 block text-sm font-semibold">
              Stundenlohn EUR
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="hourly_rate" defaultValue={(settings.hourly_rate_cents / 100).toFixed(2)} />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Stunden pro Punkt
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="point_hours" defaultValue={settings.point_hours} />
            </label>
            <Button className="mt-3" type="submit">Speichern</Button>
          </form>
          ) : null}

          <form action={createTransactionAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Ausgabe/Zahlung</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-3 block text-sm font-semibold">
              Typ
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="type" defaultValue="expense">
                <option value="expense">Ausgabe</option>
                <option value="payment">Zahlung</option>
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Titel
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="title" placeholder="Rasenmaehersprit" required />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Betrag EUR
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="amount" placeholder="30,00" required />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Bezahlt von
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="paid_by">
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Zahlung an (nur bei Zahlung)
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="paid_to">
                <option value="">Niemand</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Datum
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="occurred_on" type="date" />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Notiz
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="note" />
            </label>
            <Button className="mt-3" type="submit">Eintragen</Button>
          </form>

          {canManage ? (
          <form action={createMemberAdjustmentAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Startwert / Uebernahme</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-3 block text-sm font-semibold">
              Mitglied
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="user_id">
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>{memberLabel(member)}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Punkte +/-
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="points_delta" defaultValue="0" />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Betrag EUR +/-
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="amount_delta" defaultValue="0" />
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Grund
              <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="reason" placeholder="Anna uebernimmt Markus Punkte" required />
            </label>
            <Button className="mt-3" type="submit">Ausgleich eintragen</Button>
          </form>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
              <div className="text-sm text-[#5a6655]">Gesamtbeitrag</div>
              <div className="mt-2 text-2xl font-bold text-[#2f6b3f]">{formatMoney(billing.potCents)}</div>
            </div>
            <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
              <div className="text-sm text-[#5a6655]">Plaetze</div>
              <div className="mt-2 text-2xl font-bold text-[#2f6b3f]">{billing.slots.length}</div>
            </div>
            <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
              <div className="text-sm text-[#5a6655]">Seit</div>
              <div className="mt-2 text-2xl font-bold text-[#2f6b3f]">{formatDate(range.startsOn)}</div>
            </div>
          </div>

          <div className="space-y-3">
            {billing.slots.map((slot) => (
              <div className="overflow-hidden rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5" key={slot.slotId}>
                <div className="flex flex-col gap-1 bg-[#f8faf3] p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-bold">
                    {slot.members.length > 1 ? "Team: " : ""}
                    {slot.members.map((row) => row.displayName).join(" + ")}
                  </div>
                  <div className="text-[#5a6655]">
                    Beitrag {formatMoney(slot.contributionCents)} · Soll {formatMoney(slot.fairShareCents)} ·{" "}
                    <span className={slot.teamBalanceCents >= 0 ? "font-bold text-[#2f6b3f]" : "font-bold text-[#915b10]"}>
                      {formatMoney(slot.teamBalanceCents)}
                    </span>
                  </div>
                </div>
                {slot.members.map((row) => (
                  <div className="grid gap-1 border-t border-[#e5ecdc] p-4 text-sm sm:grid-cols-[1fr_repeat(4,110px)]" key={row.userId}>
                    <div>
                      <div className="font-bold">{row.displayName}</div>
                      <div className="text-xs text-[#6d7669]">
                        {row.isActive ? "wohnt hier" : `ausgezogen ${formatDate(row.leftOn)}`} · {row.presenceDays} Tage
                      </div>
                    </div>
                    <div>Beitrag {formatMoney(row.contributionCents)}</div>
                    <div>Anteil {formatMoney(row.teamShareCents)}</div>
                    <div>Zahlungen {formatMoney(row.transferCents)}</div>
                    <div className={row.balanceCents >= 0 ? "font-bold text-[#2f6b3f]" : "font-bold text-[#915b10]"}>
                      {formatMoney(row.balanceCents)}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {billing.slots.length === 0 ? <p className="text-sm text-[#6d7669]">Im aktuellen Zeitraum gibt es noch keine Mitglieder.</p> : null}
          </div>

          <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Zahlungsvorschlaege</h2>
            <div className="mt-3 space-y-3">
              {settlements.map((settlement) => (
                <div className="flex flex-col gap-2 rounded-lg bg-[#f2f7ec] p-3 text-sm sm:flex-row sm:items-center sm:justify-between" key={`${settlement.fromUserId}-${settlement.toUserId}-${settlement.amountCents}`}>
                  <div>
                    <span className="font-bold">{settlement.fromName}</span> zahlt an <span className="font-bold">{settlement.toName}</span>
                  </div>
                  <div className="text-lg font-bold text-[#2f6b3f]">{formatMoney(settlement.amountCents)}</div>
                </div>
              ))}
              {settlements.length === 0 ? <p className="text-sm text-[#6d7669]">Aktuell ist rechnerisch nichts auszugleichen.</p> : null}
            </div>
          </div>

          {canManage ? (
            <form action={closeBillingPeriodAction} className="rounded-lg border border-[#efc071] bg-[#fff7e8] p-4 text-[#6f4d16]">
              <h2 className="text-lg font-bold">Abrechnung abschliessen</h2>
              <p className="mt-1 text-sm">
                Speichert das Ergebnis bis gestern im Archiv. Ab heute laeuft ein neuer Zeitraum. Das kann nicht rueckgaengig gemacht werden.
              </p>
              <input name="garden_id" type="hidden" value={garden.id} />
              <label className="mt-3 block text-sm font-semibold">
                Zur Bestaetigung ABSCHLIESSEN eintippen
                <input className="mt-1 w-full rounded-lg border border-[#efc071] bg-white px-3 py-3" name="confirm" autoComplete="off" required />
              </label>
              <Button className="mt-3" type="submit">Abrechnung abschliessen</Button>
            </form>
          ) : null}

          {closedPeriods.length > 0 ? (
            <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
              <h2 className="text-lg font-bold">Archiv</h2>
              <div className="mt-3 space-y-3">
                {closedPeriods.map((period) => {
                  const archived = snapshotSettlements(period.snapshot);
                  return (
                    <details className="rounded-lg bg-[#f2f7ec] p-3 text-sm" key={period.id}>
                      <summary className="cursor-pointer font-semibold">
                        {formatDate(period.starts_on)} bis {formatDate(period.ends_on)}
                      </summary>
                      <div className="mt-2 space-y-1">
                        {archived.map((settlement) => (
                          <div key={`${period.id}-${settlement.fromUserId}-${settlement.toUserId}`}>
                            {settlement.fromName} zahlt an {settlement.toName}: <span className="font-bold">{formatMoney(settlement.amountCents)}</span>
                          </div>
                        ))}
                        {archived.length === 0 ? <div className="text-[#6d7669]">Nichts auszugleichen.</div> : null}
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Transaktionen</h2>
            <div className="mt-3 space-y-3">
              {transactions.map((transaction) => (
                <div className="rounded-lg bg-[#f2f7ec] p-3 text-sm" key={transaction.id}>
                  <div className="font-semibold">{transaction.title} · {formatMoney(transaction.amount_cents)}</div>
                  <div className="text-xs text-[#6d7669]">
                    {transaction.type} · {formatDate(transaction.occurred_on)} · {transaction.paid_by_profile?.display_name ?? "Mitglied"}
                    {transaction.paid_to_profile ? ` an ${transaction.paid_to_profile.display_name}` : ""}
                  </div>
                </div>
              ))}
              {transactions.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine Ausgaben oder Zahlungen.</p> : null}
            </div>
          </div>

          <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Ausgleiche</h2>
            <div className="mt-3 space-y-3">
              {periodAdjustments.map((adjustment) => (
                <div className="rounded-lg bg-[#f2f7ec] p-3 text-sm" key={adjustment.id}>
                  <div className="font-semibold">{adjustment.profiles?.display_name ?? "Mitglied"} · {adjustment.reason}</div>
                  <div className="text-xs text-[#6d7669]">
                    {adjustment.points_delta} Punkte · {formatMoney(adjustment.amount_cents_delta)}
                  </div>
                </div>
              ))}
              {periodAdjustments.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine Startwerte oder Uebernahmen.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
