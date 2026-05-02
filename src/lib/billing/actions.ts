"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { formatMoney } from "@/lib/format/money";
import { createNotification } from "@/lib/notifications/send";
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
  await requireUser();
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

  const { error } = await supabase.from("garden_billing_settings").upsert({
    garden_id: gardenId,
    hourly_rate_cents: hourlyRateCents,
    point_hours: pointHours,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/billing");
}

export async function createTransactionAction(formData: FormData) {
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
  const occurredOn = readString(formData, "occurred_on") || new Date().toISOString().slice(0, 10);
  const note = readString(formData, "note") || null;

  if (!gardenId || !["expense", "payment"].includes(type) || !title || !paidBy || !Number.isFinite(amountCents) || amountCents <= 0) {
    throw new Error("Transaktion ist ungueltig.");
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
}
