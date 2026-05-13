import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ChatMessage, ChatMessageType, Profile } from "@/types/domain";

export async function getChatMessages(
  supabase: SupabaseClient<Database>,
  gardenId: string,
  limit = 60,
): Promise<ChatMessage[]> {
  const { data: rows, error } = await supabase
    .from("garden_chat_messages")
    .select("id,garden_id,author_id,content,message_type,visible_to_user_id,related_task_id,created_at")
    .eq("garden_id", gardenId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getChatMessages", error.message);
    return [];
  }

  if (!rows?.length) return [];

  const authorIds = [...new Set(rows.map((r) => r.author_id).filter(Boolean))] as string[];
  const messageIds = rows.map((r) => r.id);

  const [profilesResult, mentionsResult] = await Promise.all([
    authorIds.length > 0
      ? supabase.from("profiles").select("id,display_name").in("id", authorIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("garden_chat_mentions")
      .select("message_id,user_id,profiles(id,display_name)")
      .in("message_id", messageIds),
  ]);

  const profileMap = new Map<string, Profile>();
  for (const p of profilesResult.data ?? []) {
    profileMap.set(p.id, { id: p.id, display_name: p.display_name });
  }

  type MentionRow = { message_id: string; user_id: string; profiles: { id: string; display_name: string } | { id: string; display_name: string }[] | null };
  const mentionsByMessage = new Map<string, { user_id: string; display_name: string }[]>();
  for (const m of (mentionsResult.data ?? []) as MentionRow[]) {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles;
    const entry = { user_id: m.user_id, display_name: profile?.display_name ?? "" };
    const existing = mentionsByMessage.get(m.message_id) ?? [];
    existing.push(entry);
    mentionsByMessage.set(m.message_id, existing);
  }

  return rows
    .map((r) => ({
      id: r.id,
      garden_id: r.garden_id,
      author_id: r.author_id,
      content: r.content,
      message_type: r.message_type as ChatMessageType,
      visible_to_user_id: r.visible_to_user_id,
      related_task_id: r.related_task_id,
      created_at: r.created_at,
      author_profile: r.author_id ? (profileMap.get(r.author_id) ?? null) : null,
      mentions: mentionsByMessage.get(r.id) ?? [],
    }))
    .reverse();
}

export async function getUnreadChatCount(
  supabase: SupabaseClient<Database>,
  gardenId: string,
  userId: string,
): Promise<number> {
  const { data: member } = await supabase
    .from("garden_members")
    .select("last_chat_read_at")
    .eq("garden_id", gardenId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const since = member?.last_chat_read_at;

  let query = supabase
    .from("garden_chat_messages")
    .select("id", { count: "exact", head: true })
    .eq("garden_id", gardenId)
    .or(`visible_to_user_id.is.null,visible_to_user_id.eq.${userId}`);

  if (since) {
    query = query.gt("created_at", since);
  }

  const { count } = await query;
  return count ?? 0;
}

export async function hasCronMessageForTask(
  supabase: SupabaseClient<Database>,
  gardenId: string,
  taskId: string,
  type: "system_reminder" | "system_overdue",
  since: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("garden_chat_messages")
    .select("id")
    .eq("garden_id", gardenId)
    .eq("related_task_id", taskId)
    .eq("message_type", type)
    .gte("created_at", since)
    .limit(1)
    .maybeSingle();

  return data !== null;
}

export async function hasTakeoverCallForTask(
  supabase: SupabaseClient<Database>,
  gardenId: string,
  taskId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("garden_chat_messages")
    .select("id")
    .eq("garden_id", gardenId)
    .eq("related_task_id", taskId)
    .eq("message_type", "system_overdue")
    .ilike("content", "%Jede Person kann die Aufgabe%")
    .limit(1)
    .maybeSingle();

  return data !== null;
}

export async function insertSystemChatMessage(
  supabase: SupabaseClient<Database>,
  params: {
    gardenId: string;
    content: string;
    messageType: "system_reminder" | "system_overdue";
    visibleToUserId: string | null;
    relatedTaskId: string | null;
    mentionedUserIds?: string[];
  },
): Promise<void> {
  const { data: message, error } = await supabase
    .from("garden_chat_messages")
    .insert({
      garden_id: params.gardenId,
      author_id: null,
      content: params.content.length > 2000 ? `${params.content.slice(0, 1990)}...` : params.content,
      message_type: params.messageType,
      visible_to_user_id: params.visibleToUserId,
      related_task_id: params.relatedTaskId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("insertSystemChatMessage", error.message);
    return;
  }

  const mentionedUserIds = [...new Set(params.mentionedUserIds ?? [])];
  if (message && mentionedUserIds.length > 0) {
    const { error: mentionError } = await supabase.from("garden_chat_mentions").insert(
      mentionedUserIds.map((userId) => ({
        message_id: message.id,
        user_id: userId,
      })),
    );

    if (mentionError) {
      console.error("insertSystemChatMessage mentions", mentionError.message);
    }
  }
}
