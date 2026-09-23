"use server";

import { runAction } from "@/lib/actions/run-action";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { addDaysIso, todayIsoDate } from "@/lib/format/date";
import { formatMoney } from "@/lib/format/money";
import { getCurrentTeamBilling } from "@/lib/billing/team-queries";
import { calculateSettlementSuggestions } from "@/lib/billing/queries";
import { createNotification } from "@/lib/notifications/send";
import { canManageGarden, getUserGardenRole } from "@/lib/gardens/roles";
import { createClient } from "@/lib/supabase/server";
import type { GardenTransactionType } from "@/types/domain";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function eurosToCents(value: string) {
  return Math.round(Number(value.replace(",", ".")) * 100);
}

export async function updateBillingSettingsAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");
    const hourlyRateCents = eurosToCents(readString(formData, "hourly_rate"));
    const pointHours = Number(readString(formData, "point_hours").replace(",", "."));

    if (!gardenId || !Number.isFinite(hourlyRateCents) || !Number.isFinite(pointHours)) {
      throw new Error("Abrechnungseinstellungen sind ungueltig.");
    }

    if (!canManageGarden(await getUserGardenRole(supabase, gardenId, user.id))) {
      throw new Error("Nur Owner/Admin duerfen das aendern.");
    }

    const { error } = await supabase.from("garden_billing_settings").upsert({
      garden_id: gardenId,
      hourly_rate_cents: hourlyRateCents,
      point_hours: pointHours,
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/billing");
  });
}

export async function createTransactionAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");
    const type = readString(formData, "type") as GardenTransactionType;
    const title = readString(formData, "title");
    const amountCents = eurosToCents(readString(formData, "amount"));
    const paidBy = readString(formData, "paid_by");
    const paidTo = readString(formData, "paid_to") || null;
    const occurredOn = readString(formData, "occurred_on") || todayIsoDate();
    const note = readString(formData, "note") || null;

    if (!gardenId || !["expense", "payment"].includes(type) || !title || !paidBy || !Number.isFinite(amountCents) || amountCents <= 0) {
      throw new Error("Transaktion ist ungueltig.");
    }

    if (type === "payment" && (!paidTo || paidTo === paidBy)) {
      throw new Error("Eine Zahlung braucht einen Empfaenger, der nicht der Zahlende ist.");
    }

    const { data: openPeriod } = await supabase
      .from("billing_periods")
      .select("starts_on")
      .eq("garden_id", gardenId)
      .is("ends_on", null)
      .maybeSingle();

    if (openPeriod && occurredOn < openPeriod.starts_on) {
      throw new Error(`Die Abrechnung bis ${openPeriod.starts_on} ist schon abgeschlossen. Bitte ein spaeteres Datum waehlen.`);
    }

    const { error } = await supabase.from("garden_transactions").insert({
      garden_id: gardenId,
      type,
      title,
      amount_cents: amountCents,
      paid_by: paidBy,
      paid_to: paidTo,
      occurred_on: occurredOn,
      note,
      created_by: user.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (type === "payment" && paidTo) {
      await createNotification(supabase, {
        userId: paidTo,
        gardenId,
        type: "billing_payment_received",
        title: "Zahlung eingetragen",
        message: `${title}: ${formatMoney(amountCents)}`,
      });
    }

    if (type === "expense" && paidBy !== user.id) {
      await createNotification(supabase, {
        userId: paidBy,
        gardenId,
        type: "billing_expense_recorded",
        title: "Ausgabe eingetragen",
        message: `${title}: ${formatMoney(amountCents)}`,
      });
    }

    revalidatePath("/billing");
  });
}

export async function closeBillingPeriodAction(formData: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const supabase = await createClient();

    if (!supabase) {
      throw new Error("Supabase ist nicht konfiguriert.");
    }

    const gardenId = readString(formData, "garden_id");

    if (!gardenId) {
      throw new Error("Garten fehlt.");
    }

    if (readString(formData, "confirm") !== "ABSCHLIESSEN") {
      throw new Error("Bitte zur Bestaetigung ABSCHLIESSEN eintippen.");
    }

    if (!canManageGarden(await getUserGardenRole(supabase, gardenId, user.id))) {
      throw new Error("Nur Owner/Admin duerfen die Abrechnung abschliessen.");
    }

    const { billing, range, settings } = await getCurrentTeamBilling(supabase, gardenId, addDaysIso(todayIsoDate(), -1));
    const snapshot = {
      range,
      settings: { hourly_rate_cents: settings.hourly_rate_cents, point_hours: settings.point_hours },
      potCents: billing.potCents,
      slots: billing.slots,
      settlements: calculateSettlementSuggestions(billing.rows),
    };

    const { error } = await supabase.rpc("close_billing_period", {
      target_garden_id: gardenId,
      period_snapshot: JSON.parse(JSON.stringify(snapshot)),
    });

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/billing");
  });
}
