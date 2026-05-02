import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { createTransactionAction, updateBillingSettingsAction } from "@/lib/billing/actions";
import { calculateBilling, getBillingSettings, getGardenTransactions } from "@/lib/billing/queries";
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

  const [members, tasks, transactions, settings] = await Promise.all([
    getGardenMembers(supabase, garden.id),
    getTasks(supabase, garden.id),
    getGardenTransactions(supabase, garden.id),
    getBillingSettings(supabase, garden.id),
  ]);
  const billing = calculateBilling(members, tasks, transactions, settings);

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
        </div>

        <div className="space-y-4">
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
        </div>
      </section>
    </AppShell>
  );
}
