"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, ChatMessageType, GardenMember } from "@/types/domain";
import { markChatReadAction } from "@/lib/chat/actions";
import { ChatMessageItem } from "@/components/chat/chat-message";
import { ChatInput } from "@/components/chat/chat-input";

export function ChatView({
  gardenId,
  currentUserId,
  initialMessages,
  members,
}: {
  gardenId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  members: GardenMember[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const memberMap = new Map(members.map((m) => [m.user_id, m.profiles ?? null]));

  useEffect(() => {
    // Mark chat as read so the nav badge resets on next page load
    markChatReadAction(gardenId).catch(() => null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-${gardenId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "garden_chat_messages",
          filter: `garden_id=eq.${gardenId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            garden_id: string;
            author_id: string | null;
            content: string;
            message_type: string;
            visible_to_user_id: string | null;
            related_task_id: string | null;
            created_at: string;
          };

          // Private messages not meant for current user are filtered client-side.
          // Note: the raw row is still received by all subscribers (Supabase Realtime
          // does not apply RLS to postgres_changes by default).
          if (row.visible_to_user_id !== null && row.visible_to_user_id !== currentUserId) {
            return;
          }

          const profile = row.author_id ? (memberMap.get(row.author_id) ?? null) : null;
          const newMsg: ChatMessage = {
            id: row.id,
            garden_id: row.garden_id,
            author_id: row.author_id,
            content: row.content,
            message_type: row.message_type as ChatMessageType,
            visible_to_user_id: row.visible_to_user_id,
            related_task_id: row.related_task_id,
            created_at: row.created_at,
            author_profile: profile,
            mentions: [],
          };

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gardenId, currentUserId]);

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col rounded-xl border border-[#d7dfcf] bg-[#f8faf3] overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-[#5a6655]">
            Noch keine Nachrichten. Seid ihr bereit?
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            currentUserId={currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput
        gardenId={gardenId}
        currentUserId={currentUserId}
        members={members}
      />
    </div>
  );
}
