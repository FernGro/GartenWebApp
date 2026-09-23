import { formatDate } from "@/lib/format/date";
import { Mower } from "@/components/ui/mower";
import type { ScoreRow } from "@/types/domain";

const mowerColors = ["#2f6b3f", "#3f6f8f", "#8a5a2b", "#6b4f8f", "#a0442f", "#44705f"];

export function ScoreRace({ scores, currentUserId, fairnessName }: { scores: ScoreRow[]; currentUserId?: string; fairnessName?: string | null }) {
  if (scores.length === 0) {
    return null;
  }

  const ranked = [...scores].sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName));
  const maxPoints = Math.max(1, ...ranked.map((score) => score.points));

  return (
    <section className="overflow-hidden rounded-2xl border border-[#d7dfcf] bg-[#fffef9] shadow-[0_2px_0_#d7dfcf]">
      <div className="px-4 pb-2 pt-4">
        <h2 className="text-xl font-bold">Rasenmaeher-Rennen</h2>
        <p className="mt-1 text-sm text-[#5a6655]">Wer mehr Dienste erledigt, hat mehr Rasen gemaeht.</p>
      </div>
      <ol className="space-y-3 px-4 pb-4 pt-2">
        {ranked.map((score, index) => {
          const progress = Math.round((score.points / maxPoints) * 100);
          const isLeader = index === 0 && score.points > 0;
          const isMe = score.userId === currentUserId;
          return (
            <li key={score.userId}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className={`truncate font-semibold ${isMe ? "text-[#2f6b3f]" : "text-[#172016]"}`}>
                  {index + 1}. {score.displayName}
                  {isMe ? " (du)" : ""}
                </span>
                <span className="shrink-0 font-display text-base font-bold tabular-nums text-[#2f6b3f]">{score.points} P.</span>
              </div>
              <div className="relative h-12 rounded-xl">
                <div className="lawn-tall absolute inset-0 overflow-hidden rounded-xl" />
                <div
                  className="race-trail lawn-mowed absolute inset-y-0 left-0 rounded-l-xl"
                  style={{ width: `${progress}%`, animationDelay: `${index * 90}ms` }}
                />
                <svg aria-hidden="true" className="absolute right-1 top-1 h-10 w-6" viewBox="0 0 24 40">
                  <path d="M4 2v36" stroke="#405039" strokeLinecap="round" strokeWidth="2.5" />
                  <path className={isLeader ? "flag-wave" : ""} d="M5 3h15l-4 6 4 6H5z" fill={isLeader ? "#d2a24c" : "#f4efe1"} />
                </svg>
                <div
                  className="race-mower absolute bottom-0"
                  style={{ left: `max(0px, calc(${progress}% - 4.5rem))`, animationDelay: `${index * 90}ms` }}
                >
                  <Mower className="h-10 w-[4.5rem]" color={mowerColors[index % mowerColors.length]} idle />
                </div>
              </div>
              <div className="mt-1 text-xs text-[#6d7669]">
                {score.lastCompletedAt ? `Zuletzt gemaeht am ${formatDate(score.lastCompletedAt)}` : "Noch kein Dienst erledigt"}
              </div>
            </li>
          );
        })}
      </ol>
      {fairnessName ? (
        <p className="border-t border-[#e5ecdc] bg-[#f8faf3] px-4 py-3 text-sm text-[#405039]">
          Als Naechstes ist <span className="font-semibold">{fairnessName}</span> dran, damit es fair bleibt.
        </p>
      ) : null}
    </section>
  );
}
