"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { assertCleanText } from "@/lib/moderation/content";
import { createNotification } from "@/lib/notifications/send";
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

  if (mentionedUserIds.length > 0) {
    const members = await getGardenMembers(supabase, gardenId);
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
          title: "Du wurdest im Chat erwähnt",
          message: content.length > 80 ? content.slice(0, 80) + "…" : content,
          relatedTaskId: null,
        });
      }
    }
  }

  revalidatePath("/chat");
}

export async function deleteChatMessageAction(formData: FormData) {
  const user = await requireUser();
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

  void user;
  revalidatePath("/chat");
}
