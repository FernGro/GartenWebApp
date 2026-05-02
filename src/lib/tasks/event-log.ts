import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TaskEvent } from "@/types/domain";

export type GardenTaskEvent = TaskEvent & {
  tasks?: { title: string } | null;
};

export async function getGardenTaskEvents(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<GardenTaskEvent[]> {
  const { data, error } = await supabase
    .from("task_events")
    .select("id,task_id,garden_id,actor_id,event_type,from_user_id,to_user_id,points_delta,note,created_at,actor_profile:profiles!task_events_actor_id_fkey(id,display_name),tasks(title)")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("getGardenTaskEvents", error.message);
    return [];
  }

  return (data ?? []).map((event) => ({
    ...event,
    actor_profile: Array.isArray(event.actor_profile) ? event.actor_profile[0] ?? null : event.actor_profile,
    tasks: Array.isArray(event.tasks) ? event.tasks[0] ?? null : event.tasks,
  })) as GardenTaskEvent[];
}
