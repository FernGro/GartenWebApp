import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { TaskTakeoverRequest } from "@/types/domain";

export async function getPendingTakeoverRequests(
  supabase: SupabaseClient<Database>,
  taskId: string,
): Promise<TaskTakeoverRequest[]> {
  const { data, error } = await supabase
    .from("task_takeover_requests")
    .select("id,task_id,garden_id,requested_by,current_assignee,status,decided_by,decided_at,note,created_at,requested_profile:profiles!task_takeover_requests_requested_by_fkey(id,display_name),current_assignee_profile:profiles!task_takeover_requests_current_assignee_fkey(id,display_name)")
    .eq("task_id", taskId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getPendingTakeoverRequests", error.message);
    return [];
  }

  return (data ?? []).map((request) => ({
    ...request,
    requested_profile: Array.isArray(request.requested_profile)
      ? request.requested_profile[0] ?? null
      : request.requested_profile,
    current_assignee_profile: Array.isArray(request.current_assignee_profile)
      ? request.current_assignee_profile[0] ?? null
      : request.current_assignee_profile,
  })) as TaskTakeoverRequest[];
}
