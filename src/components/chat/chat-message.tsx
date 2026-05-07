import type { ChatMessage } from "@/types/domain";
import { formatDateTime } from "@/lib/format/date";

function renderContent(content: string): React.ReactNode[] {
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith("@")
      ? <strong key={i} className="font-semibold text-[#2f6b3f]">{part}</strong>
      : part.split("\n").flatMap((line, j, arr) =>
          j < arr.length - 1 ? [line, <br key={`${i}-${j}`} />] : [line]
        ),
  );
}

export function ChatMessageItem({
  message,
  currentUserId,
}: {
  message: ChatMessage;
  currentUserId: string;
}) {
  const isSystem = message.message_type !== "user";
  const isPrivate = message.visible_to_user_id !== null;
  const isOwn = message.author_id === currentUserId;

  if (isSystem) {
    const icon = message.message_type === "system_overdue" ? "⚠️" : "⏰";
    return (
      <div className="flex justify-center">
        <div className="max-w-lg rounded-lg border border-[#d7dfcf] bg-[#f8faf3] px-4 py-3 text-sm text-[#5a6655]">
          {isPrivate && (
            <span className="mb-1 flex items-center gap-1 text-xs text-[#5a6655]">
              <span>🔒</span> Nur für dich
            </span>
          )}
          <span className="mr-1">{icon}</span>
          <span className="whitespace-pre-line">{renderContent(message.content)}</span>
          <div className="mt-1 text-right text-xs text-[#5a6655]/70">
            {formatDateTime(message.created_at)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-sm rounded-2xl px-4 py-2.5 text-sm ${
        isOwn
          ? "rounded-br-sm bg-[#2f6b3f] text-white"
          : "rounded-bl-sm bg-white border border-[#d7dfcf] text-[#172016]"
      }`}>
        {!isOwn && (
          <div className="mb-0.5 text-xs font-semibold text-[#2f6b3f]">
            {message.author_profile?.display_name ?? "Unbekannt"}
          </div>
        )}
        <div className="whitespace-pre-line leading-snug">{renderContent(message.content)}</div>
        <div className={`mt-1 text-right text-xs ${isOwn ? "text-white/70" : "text-[#5a6655]/70"}`}>
          {formatDateTime(message.created_at)}
        </div>
      </div>
    </div>
  );
}
