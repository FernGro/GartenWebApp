import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { sendTelegramMessage } from "./telegram";

type NotificationInput = {
  userId: string;
  gardenId: string;
  type: string;
  title: string;
  message: string;
  relatedTaskId?: string | null;
};

export async function createNotification(
  supabase: SupabaseClient<Database>,
  input: NotificationInput,
) {
  const { data: contact } = await supabase
    .from("notification_contacts")
    .select("telegram_chat_id,telegram_enabled,in_app_enabled")
    .eq("garden_id", input.gardenId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (contact?.in_app_enabled ?? true) {
    await supabase.from("notifications").insert({
      user_id: input.userId,
      garden_id: input.gardenId,
      type: input.type,
      title: input.title,
      message: input.message,
      related_task_id: input.relatedTaskId ?? null,
    });
  }

  if (contact?.telegram_enabled && contact.telegram_chat_id) {
    try {
      await sendTelegramMessage(contact.telegram_chat_id, `${input.title}\n${input.message}`);
    } catch (error) {
      console.error("createNotification telegram", error);
    }
  }
}
