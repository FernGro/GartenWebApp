import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { BillingPeriod, GardenBillingSettings, GardenTransaction } from "@/types/domain";

export async function getBillingSettings(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<GardenBillingSettings> {
  const { data, error } = await supabase
    .from("garden_billing_settings")
    .select("garden_id,hourly_rate_cents,point_hours")
    .eq("garden_id", gardenId)
    .maybeSingle();

  if (error) {
    console.error("getBillingSettings", error.message);
  }

  return data ?? { garden_id: gardenId, hourly_rate_cents: 1000, point_hours: 1 };
}

export async function getGardenTransactions(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<GardenTransaction[]> {
  const { data, error } = await supabase
    .from("garden_transactions")
    .select("id,garden_id,type,title,amount_cents,paid_by,paid_to,occurred_on,note,created_by,created_at,paid_by_profile:profiles!garden_transactions_paid_by_fkey(id,display_name),paid_to_profile:profiles!garden_transactions_paid_to_fkey(id,display_name)")
    .eq("garden_id", gardenId)
    .order("occurred_on", { ascending: false });

  if (error) {
    console.error("getGardenTransactions", error.message);
    return [];
  }

  return (data ?? []).map((transaction) => ({
    ...transaction,
    paid_by_profile: Array.isArray(transaction.paid_by_profile)
      ? transaction.paid_by_profile[0] ?? null
      : transaction.paid_by_profile,
    paid_to_profile: Array.isArray(transaction.paid_to_profile)
      ? transaction.paid_to_profile[0] ?? null
      : transaction.paid_to_profile,
  })) as GardenTransaction[];
}

export async function getBillingPeriods(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<BillingPeriod[]> {
  const { data, error } = await supabase
    .from("billing_periods")
    .select("id,garden_id,starts_on,ends_on,closed_at,snapshot")
    .eq("garden_id", gardenId)
    .order("starts_on", { ascending: false });

  if (error) {
    console.error("getBillingPeriods", error.message);
    return [];
  }

  return data ?? [];
}

type BalanceRow = {
  userId: string;
  displayName: string;
  balanceCents: number;
};

export type SettlementSuggestion = {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amountCents: number;
};

export function calculateSettlementSuggestions(rows: BalanceRow[]): SettlementSuggestion[] {
  const debtors = rows
    .filter((row) => row.balanceCents < 0)
    .map((row) => ({ ...row, remaining: Math.abs(row.balanceCents) }))
    .sort((a, b) => b.remaining - a.remaining);
  const creditors = rows
    .filter((row) => row.balanceCents > 0)
    .map((row) => ({ ...row, remaining: row.balanceCents }))
    .sort((a, b) => b.remaining - a.remaining);
  const suggestions: SettlementSuggestion[] = [];

  for (const debtor of debtors) {
    for (const creditor of creditors) {
      if (debtor.remaining <= 0) {
        break;
      }

      if (creditor.remaining <= 0) {
        continue;
      }

      const amountCents = Math.min(debtor.remaining, creditor.remaining);
      debtor.remaining -= amountCents;
      creditor.remaining -= amountCents;
      suggestions.push({
        fromUserId: debtor.userId,
        fromName: debtor.displayName,
        toUserId: creditor.userId,
        toName: creditor.displayName,
        amountCents,
      });
    }
  }

  return suggestions.filter((suggestion) => suggestion.amountCents > 0);
}
