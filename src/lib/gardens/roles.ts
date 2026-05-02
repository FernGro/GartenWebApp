import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { GardenRole } from "@/types/domain";

export async function getUserGardenRole(
  supabase: SupabaseClient<Database>,
  gardenId: string,
  userId: string,
): Promise<GardenRole | null> {
  const { data, error } = await supabase
    .from("garden_members")
    .select("role")
    .eq("garden_id", gardenId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("getUserGardenRole", error.message);
    return null;
  }

  return data?.role ?? null;
}

export function canManageGarden(role: GardenRole | null) {
  return role === "owner" || role === "admin";
}
