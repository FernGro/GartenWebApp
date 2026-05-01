import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { GardenInvite } from "@/types/domain";

export async function getGardenInvites(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<GardenInvite[]> {
  const { data, error } = await supabase
    .from("garden_invites")
    .select("id,garden_id,email,role,token,created_by,accepted_by,accepted_at,expires_at,created_at")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getGardenInvites", error.message);
    return [];
  }

  return data ?? [];
}

export async function getInviteByToken(
  supabase: SupabaseClient<Database>,
  token: string,
): Promise<GardenInvite | null> {
  const { data, error } = await supabase
    .from("garden_invites")
    .select("id,garden_id,email,role,token,created_by,accepted_by,accepted_at,expires_at,created_at")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    console.error("getInviteByToken", error.message);
    return null;
  }

  return data;
}
