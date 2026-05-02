"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { sendTelegramMessage } from "@/lib/notifications/telegram";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function updateNotificationContactAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const whatsappPhone = readString(formData, "whatsapp_phone") || null;
  const telegramChatId = readString(formData, "telegram_chat_id") || null;
  const telegramEnabled = formData.get("telegram_enabled") === "on";
  const inAppEnabled = formData.get("in_app_enabled") !== "off";

  if (!gardenId) {
    throw new Error("Garten fehlt.");
  }

  const { error } = await supabase.from("notification_contacts").upsert({
    garden_id: gardenId,
    user_id: user.id,
    whatsapp_phone: whatsappPhone,
    telegram_chat_id: telegramChatId,
    telegram_enabled: telegramEnabled,
    in_app_enabled: inAppEnabled,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/settings/garden");
}

export async function sendTelegramTestAction(formData: FormData) {
  await requireUser();
  const chatId = readString(formData, "telegram_chat_id");

  if (!chatId) {
    throw new Error("Telegram Chat-ID fehlt.");
  }

  await sendTelegramMessage(chatId, "Garten Dienstplan Test: Telegram ist verbunden.");
  revalidatePath("/settings/garden");
}
