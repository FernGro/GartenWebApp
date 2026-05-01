import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Notification } from "@/types/domain";

export async function getUnreadNotificationCount(supabase: SupabaseClient<Database>, gardenId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("garden_id", gardenId)
    .is("read_at", null);

  if (error) {
    console.error("getUnreadNotificationCount", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function getNotifications(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id,user_id,garden_id,type,title,message,related_task_id,read_at,created_at")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getNotifications", error.message);
    return [];
  }

  return data ?? [];
}
