import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { Garden, GardenMember } from "@/types/domain";

export async function getCurrentGarden(
  supabase: SupabaseClient<Database>,
): Promise<Garden | null> {
  const { data, error } = await supabase
    .from("gardens")
    .select("id,name,created_by")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getCurrentGarden", error.message);
    return null;
  }

  return data;
}

export async function getGardenMembers(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<GardenMember[]> {
  const { data, error } = await supabase
    .from("garden_members")
    .select("id,garden_id,user_id,role,is_active,profiles(id,display_name)")
    .eq("garden_id", gardenId)
    .eq("is_active", true)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("getGardenMembers", error.message);
    return [];
  }

  return (data ?? []).map((member) => ({
    ...member,
    profiles: Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles,
  })) as GardenMember[];
}
