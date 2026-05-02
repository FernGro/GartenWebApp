import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { MemberAdjustment } from "@/types/domain";

export async function getMemberAdjustments(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<MemberAdjustment[]> {
  const { data, error } = await supabase
    .from("member_adjustments")
    .select("id,garden_id,user_id,points_delta,amount_cents_delta,reason,created_by,created_at,profiles(id,display_name)")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getMemberAdjustments", error.message);
    return [];
  }

  return (data ?? []).map((adjustment) => ({
    ...adjustment,
    profiles: Array.isArray(adjustment.profiles) ? adjustment.profiles[0] ?? null : adjustment.profiles,
  })) as MemberAdjustment[];
}
