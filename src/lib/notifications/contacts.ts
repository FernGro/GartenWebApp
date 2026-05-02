import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { NotificationContact } from "@/types/domain";

export async function getNotificationContact(
  supabase: SupabaseClient<Database>,
  gardenId: string,
  userId: string,
): Promise<NotificationContact | null> {
  const { data, error } = await supabase
    .from("notification_contacts")
    .select("user_id,garden_id,whatsapp_phone,telegram_chat_id,telegram_enabled,in_app_enabled")
    .eq("garden_id", gardenId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("getNotificationContact", error.message);
    return null;
  }

  return data;
}
