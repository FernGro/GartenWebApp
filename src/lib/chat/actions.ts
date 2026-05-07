"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertCleanText } from "@/lib/moderation/content";
import { createNotification } from "@/lib/notifications/send";
import { sendWebPushToUser } from "@/lib/notifications/web-push";
import { getGardenMembers } from "@/lib/gardens/queries";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function sendChatMessageAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const gardenId = readString(formData, "garden_id");
  const content = readString(formData, "content");

  if (!gardenId) throw new Error("Garten fehlt.");
  if (!content) throw new Error("Nachricht fehlt.");
  if (content.length > 2000) throw new Error("Nachricht zu lang (max. 2000 Zeichen).");

  assertCleanText(content, "Nachricht");

  const mentionedUserIds: string[] = (() => {
    try {
      const raw = readString(formData, "mentioned_user_ids");
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
    } catch {
      return [];
    }
  })();

  const { data: message, error } = await supabase
    .from("garden_chat_messages")
    .insert({
      garden_id: gardenId,
      author_id: user.id,
      content,
      message_type: "user",
      visible_to_user_id: null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const [members, profileResult] = await Promise.all([
    getGardenMembers(supabase, gardenId),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);

  const senderName = profileResult.data?.display_name ?? "Jemand";
  const otherMembers = members.filter((m) => m.user_id !== user.id);
  const mentionedSet = new Set(mentionedUserIds);

  // In-app notification + push for @mentioned members
  if (mentionedUserIds.length > 0) {
    const validMemberIds = new Set(members.map((m) => m.user_id));
    const mentionRows = mentionedUserIds
      .filter((id) => validMemberIds.has(id) && id !== user.id)
      .map((userId) => ({ message_id: message.id, user_id: userId }));

    if (mentionRows.length > 0) {
      await supabase.from("garden_chat_mentions").insert(mentionRows);

      for (const row of mentionRows) {
        await createNotification(supabase, {
          userId: row.user_id,
          gardenId,
          type: "chat_mention",
          title: `💬 ${senderName} hat dich erwähnt`,
          message: content.length > 80 ? content.slice(0, 80) + "…" : content,
          relatedTaskId: null,
        });
      }
    }
  }

  // Push-only for all other members (not mentioned — those already got push via createNotification)
  // Admin client required: RLS on web_push_subscriptions only allows reading own rows.
  const adminSupabase = createAdminClient();
  if (adminSupabase) {
    const preview = content.length > 80 ? content.slice(0, 80) + "…" : content;
    const pushTargets = otherMembers.filter((m) => !mentionedSet.has(m.user_id));

    for (const member of pushTargets) {
      await sendWebPushToUser(adminSupabase, member.user_id, gardenId, {
        title: `💬 ${senderName}`,
        message: preview,
        url: "/chat",
      });
    }
  }

  revalidatePath("/chat");
}

export async function markChatReadAction(gardenId: string): Promise<void> {
  const user = await requireUser();
  // Admin client used because garden_members has no self-update policy for this column
  // (adding one would also allow updating role/is_active from the client).
  const admin = createAdminClient();
  if (!admin) return;

  await admin
    .from("garden_members")
    .update({ last_chat_read_at: new Date().toISOString() })
    .eq("garden_id", gardenId)
    .eq("user_id", user.id)
    .eq("is_active", true);
}

export async function deleteChatMessageAction(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  if (!supabase) {
    throw new Error("Supabase ist nicht konfiguriert.");
  }

  const messageId = readString(formData, "message_id");
  if (!messageId) throw new Error("Nachricht fehlt.");

  const { error } = await supabase
    .from("garden_chat_messages")
    .delete()
    .eq("id", messageId);

  if (error) throw new Error(error.message);

  revalidatePath("/chat");
}
