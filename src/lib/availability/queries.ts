import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { AvailabilityWindow } from "@/types/domain";

export async function getAvailability(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<AvailabilityWindow[]> {
  const { data, error } = await supabase
    .from("availability")
    .select("id,user_id,garden_id,from_date,to_date,reason,profiles(id,display_name)")
    .eq("garden_id", gardenId)
    .order("from_date", { ascending: true });

  if (error) {
    console.error("getAvailability", error.message);
    return [];
  }

  return (data ?? []).map((entry) => ({
    ...entry,
    profiles: Array.isArray(entry.profiles) ? entry.profiles[0] ?? null : entry.profiles,
  })) as AvailabilityWindow[];
}
