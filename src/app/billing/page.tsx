import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createMemberAdjustmentAction } from "@/lib/adjustments/actions";
import { getMemberAdjustments } from "@/lib/adjustments/queries";
import { createTransactionAction, updateBillingSettingsAction } from "@/lib/billing/actions";
import { calculateBilling, calculateSettlementSuggestions, getBillingSettings, getGardenTransactions } from "@/lib/billing/queries";
import { formatDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { getCurrentGarden, getGardenMembers } from "@/lib/gardens/queries";
import { createClient } from "@/lib/supabase/server";
import { getTasks } from "@/lib/tasks/queries";

export const dynamic = "force-dynamic";

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

  const [members, tasks, transactions, settings, adjustments] = await Promise.all([
    getGardenMembers(supabase, garden.id),
    getTasks(supabase, garden.id),
    getGardenTransactions(supabase, garden.id),
    getBillingSettings(supabase, garden.id),
    getMemberAdjustments(supabase, garden.id),
  ]);
  const billing = calculateBilling(members, tasks, transactions, settings, adjustments);
  const settlements = calculateSettlementSuggestions(billing);

  return (
    <AppShell>
      <div className="mb-6">
        <p className="text-sm font-semibold text-[#2f6b3f]">{garden.name}</p>
        <h1 className="text-3xl font-bold">Abrechnung</h1>
        <p className="mt-2 text-sm text-[#5a6655]">Punkte werden als Arbeitszeit bewertet, Ausgaben und Zahlungen werden verrechnet.</p>
      </div>

      <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
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
                  <option key={member.user_id} value={member.user_id}>{member.profiles?.display_name ?? "Mitglied"}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Zahlung an optional
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="paid_to">
                <option value="">Niemand</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>{member.profiles?.display_name ?? "Mitglied"}</option>
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

          <form action={createMemberAdjustmentAction} className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
            <h2 className="text-lg font-bold">Startwert / Uebernahme</h2>
            <input name="garden_id" type="hidden" value={garden.id} />
            <label className="mt-3 block text-sm font-semibold">
              Mitglied
              <select className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3" name="user_id">
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>{member.profiles?.display_name ?? "Mitglied"}</option>
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
        </div>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
              <div className="text-sm text-[#5a6655]">Arbeitswert</div>
              <div className="mt-2 text-2xl font-bold text-[#2f6b3f]">{formatMoney(billing.reduce((sum, row) => sum + row.workCents, 0))}</div>
            </div>
            <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
              <div className="text-sm text-[#5a6655]">Auslagen</div>
              <div className="mt-2 text-2xl font-bold text-[#2f6b3f]">{formatMoney(billing.reduce((sum, row) => sum + row.expenseCents, 0))}</div>
            </div>
            <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
              <div className="text-sm text-[#5a6655]">Pro Person</div>
              <div className="mt-2 text-2xl font-bold text-[#2f6b3f]">{formatMoney(billing[0]?.fairShareCents ?? 0)}</div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5">
            {billing.map((row) => (
              <div className="grid gap-2 border-b border-[#e5ecdc] p-4 text-sm sm:grid-cols-[1fr_repeat(4,120px)]" key={row.userId}>
                <div className="font-bold">{row.displayName}</div>
                <div>Arbeit {formatMoney(row.workCents)}</div>
                <div>Auslagen {formatMoney(row.expenseCents)}</div>
                <div>Soll {formatMoney(row.fairShareCents)}</div>
                <div className={row.balanceCents >= 0 ? "font-bold text-[#2f6b3f]" : "font-bold text-[#915b10]"}>
                  {formatMoney(row.balanceCents)}
                </div>
              </div>
            ))}
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
              {adjustments.map((adjustment) => (
                <div className="rounded-lg bg-[#f2f7ec] p-3 text-sm" key={adjustment.id}>
                  <div className="font-semibold">{adjustment.profiles?.display_name ?? "Mitglied"} · {adjustment.reason}</div>
                  <div className="text-xs text-[#6d7669]">
                    {adjustment.points_delta} Punkte · {formatMoney(adjustment.amount_cents_delta)}
                  </div>
                </div>
              ))}
              {adjustments.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine Startwerte oder Uebernahmen.</p> : null}
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
