"use client";

import { useRef, useState, useTransition } from "react";
import type { GardenMember } from "@/types/domain";
import { sendChatMessageAction } from "@/lib/chat/actions";

export function ChatInput({
  gardenId,
  currentUserId,
  members,
}: {
  gardenId: string;
  currentUserId: string;
  members: GardenMember[];
}) {
  const [content, setContent] = useState("");
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const otherMembers = members.filter((m) => m.user_id !== currentUserId);
  const filteredMembers = mentionQuery !== null
    ? otherMembers.filter((m) =>
        m.profiles?.display_name?.toLowerCase().includes(mentionQuery.toLowerCase())
      )
    : [];

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);

    const cursor = e.target.selectionStart ?? val.length;
    const beforeCursor = val.slice(0, cursor);
    const lastWord = beforeCursor.split(/\s/).pop() ?? "";

    if (lastWord.startsWith("@") && lastWord.length >= 1) {
      setMentionQuery(lastWord.slice(1));
    } else {
      setMentionQuery(null);
    }
  }

  function handleMentionSelect(member: GardenMember) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart ?? content.length;
    const before = content.slice(0, cursor);
    const after = content.slice(cursor);
    const atPos = before.lastIndexOf("@");
    const name = member.profiles?.display_name ?? member.user_id;
    const newContent = before.slice(0, atPos) + `@${name} ` + after;

    setContent(newContent);
    setMentionQuery(null);

    if (!mentionedUserIds.includes(member.user_id)) {
      setMentionedUserIds((prev) => [...prev, member.user_id]);
    }

    textarea.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      setMentionQuery(null);
    }
  }

  function submit() {
    const trimmed = content.trim();
    if (!trimmed || isPending) return;

    const userIds = [...mentionedUserIds];
    setContent("");
    setMentionedUserIds([]);
    setMentionQuery(null);
    setError(null);

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("garden_id", gardenId);
        fd.set("content", trimmed);
        fd.set("mentioned_user_ids", JSON.stringify(userIds));
        await sendChatMessageAction(fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Fehler beim Senden.");
        setContent(trimmed);
      }
    });
  }

  return (
    <div className="border-t border-[#d7dfcf] bg-[#fffef9] px-4 py-3">
      {error && (
        <p className="mb-2 text-sm text-red-600">{error}</p>
      )}
      <div className="relative">
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="absolute bottom-full left-0 mb-1 min-w-48 rounded-lg border border-[#d7dfcf] bg-white shadow-md">
            {filteredMembers.map((m) => (
              <button
                key={m.user_id}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[#e7efe1]"
                onMouseDown={(e) => { e.preventDefault(); handleMentionSelect(m); }}
                type="button"
              >
                <span className="font-medium text-[#172016]">{m.profiles?.display_name}</span>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={textareaRef}
          className="w-full resize-none rounded-xl border border-[#d7dfcf] bg-white px-3 py-2.5 text-sm leading-snug placeholder-[#5a6655]/60 focus:border-[#2f6b3f] focus:outline-none"
          disabled={isPending}
          maxLength={2000}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Nachricht schreiben… (@ für Erwähnung, Enter zum Senden)"
          rows={2}
          value={content}
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-[#5a6655]/60">{content.length}/2000</span>
        <button
          className="rounded-lg bg-[#2f6b3f] px-4 py-2 text-sm font-semibold text-white hover:bg-[#245533] disabled:opacity-50"
          disabled={!content.trim() || isPending}
          onClick={submit}
          type="button"
        >
          {isPending ? "Sendet…" : "Senden"}
        </button>
      </div>
    </div>
  );
}
