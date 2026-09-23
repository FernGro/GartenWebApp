import type { SupabaseClient } from "@supabase/supabase-js";
import { getMemberAdjustments } from "@/lib/adjustments/queries";
import { getBillingPeriods, getBillingSettings, getGardenTransactions } from "@/lib/billing/queries";
import { calculateTeamBilling } from "@/lib/billing/teams";
import { todayIsoDate } from "@/lib/format/date";
import { getGardenMembers } from "@/lib/gardens/queries";
import { getTasks } from "@/lib/tasks/queries";
import type { Database } from "@/types/database";

export async function getCurrentTeamBilling(supabase: SupabaseClient<Database>, gardenId: string, endsOn = todayIsoDate()) {
  const [members, tasks, transactions, settings, adjustments, periods] = await Promise.all([
    getGardenMembers(supabase, gardenId, true),
    getTasks(supabase, gardenId),
    getGardenTransactions(supabase, gardenId),
    getBillingSettings(supabase, gardenId),
    getMemberAdjustments(supabase, gardenId),
    getBillingPeriods(supabase, gardenId),
  ]);
  const openPeriod = periods.find((period) => period.ends_on === null) ?? null;
  const startsOn = openPeriod?.starts_on ?? members.map((member) => member.joined_on).sort()[0] ?? todayIsoDate();
  const range = { startsOn, endsOn };
  const billing = calculateTeamBilling({ members, tasks, transactions, adjustments, settings, period: range });

  return {
    billing,
    range,
    members,
    transactions: transactions.filter((transaction) => transaction.occurred_on >= startsOn),
    adjustments,
    settings,
    closedPeriods: periods.filter((period) => period.ends_on !== null),
  };
}
