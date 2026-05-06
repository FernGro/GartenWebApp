import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ScoreRow, Task, TaskTemplate, TaskWithPeople } from "@/types/domain";

export async function getTasks(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<TaskWithPeople[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id,garden_id,template_id,title,description,points,status,due_date,assigned_to,original_assignee,completed_by,completed_at,created_by,assignment_locked,locked_by,locked_at,created_at,updated_at,assigned_profile:profiles!tasks_assigned_to_fkey(id,display_name),completed_profile:profiles!tasks_completed_by_fkey(id,display_name)",
    )
    .eq("garden_id", gardenId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getTasks", error.message);
    return [];
  }

  return (data ?? []).map((task) => ({
    ...task,
    assigned_profile: Array.isArray(task.assigned_profile)
      ? task.assigned_profile[0] ?? null
      : task.assigned_profile,
    completed_profile: Array.isArray(task.completed_profile)
      ? task.completed_profile[0] ?? null
      : task.completed_profile,
  })) as TaskWithPeople[];
}

export async function getTask(
  supabase: SupabaseClient<Database>,
  taskId: string,
): Promise<TaskWithPeople | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id,garden_id,template_id,title,description,points,status,due_date,assigned_to,original_assignee,completed_by,completed_at,created_by,assignment_locked,locked_by,locked_at,created_at,updated_at,assigned_profile:profiles!tasks_assigned_to_fkey(id,display_name),completed_profile:profiles!tasks_completed_by_fkey(id,display_name)",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    console.error("getTask", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    ...data,
    assigned_profile: Array.isArray(data.assigned_profile)
      ? data.assigned_profile[0] ?? null
      : data.assigned_profile,
    completed_profile: Array.isArray(data.completed_profile)
      ? data.completed_profile[0] ?? null
      : data.completed_profile,
  } as TaskWithPeople;
}

export async function getTaskTemplates(
  supabase: SupabaseClient<Database>,
  gardenId: string,
): Promise<TaskTemplate[]> {
  const { data, error } = await supabase
    .from("task_templates")
    .select(
      "id,garden_id,title,default_points,estimated_minutes,season_start_month,season_end_month,season_start_day,season_end_day,recurrence_type,recurrence_interval,custom_interval_days,is_weather_dependent,is_active",
    )
    .or(`garden_id.is.null,garden_id.eq.${gardenId}`)
    .eq("is_active", true)
    .order("title", { ascending: true });

  if (error) {
    console.error("getTaskTemplates", error.message);
    return [];
  }

  const byTitle = new Map<string, TaskTemplate>();

  for (const template of data ?? []) {
    const key = template.title.toLowerCase().trim();
    const existing = byTitle.get(key);

    if (!existing || (!existing.garden_id && template.garden_id === gardenId)) {
      byTitle.set(key, template);
    }
  }

  return [...byTitle.values()].sort((a, b) => a.title.localeCompare(b.title));
}

export function calculateScores(tasks: Task[], members: { user_id: string; profiles?: { display_name: string } | null }[]): ScoreRow[] {
  return members
    .map((member) => {
      const completedTasks = tasks.filter((task) => task.completed_by === member.user_id && task.status === "done");
      const points = completedTasks.reduce((sum, task) => sum + task.points, 0);
      const lastCompletedAt = completedTasks
        .map((task) => task.completed_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1) ?? null;

      return {
        userId: member.user_id,
        displayName: member.profiles?.display_name ?? "Unbekannt",
        points,
        lastCompletedAt,
      };
    })
    .sort((a, b) => a.points - b.points || (a.lastCompletedAt ?? "").localeCompare(b.lastCompletedAt ?? ""));
}
