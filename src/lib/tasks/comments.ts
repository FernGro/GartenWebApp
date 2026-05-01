import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TaskComment, TaskEvent } from "@/types/domain";

export async function getTaskComments(
  supabase: SupabaseClient<Database>,
  taskId: string,
): Promise<TaskComment[]> {
  const { data, error } = await supabase
    .from("task_comments")
    .select("id,task_id,garden_id,user_id,comment,created_at,profiles(id,display_name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getTaskComments", error.message);
    return [];
  }

  return (data ?? []).map((comment) => ({
    ...comment,
    profiles: Array.isArray(comment.profiles) ? comment.profiles[0] ?? null : comment.profiles,
  })) as TaskComment[];
}

export async function getTaskEvents(
  supabase: SupabaseClient<Database>,
  taskId: string,
): Promise<TaskEvent[]> {
  const { data, error } = await supabase
    .from("task_events")
    .select("id,task_id,garden_id,actor_id,event_type,from_user_id,to_user_id,points_delta,note,created_at,actor_profile:profiles!task_events_actor_id_fkey(id,display_name)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getTaskEvents", error.message);
    return [];
  }

  return (data ?? []).map((event) => ({
    ...event,
    actor_profile: Array.isArray(event.actor_profile) ? event.actor_profile[0] ?? null : event.actor_profile,
  })) as TaskEvent[];
}
