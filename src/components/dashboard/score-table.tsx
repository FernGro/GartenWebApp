import type { ScoreRow } from "@/types/domain";
import { formatDate } from "@/lib/format/date";

export function ScoreTable({ scores }: { scores: ScoreRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5">
      <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#d7dfcf] bg-[#f2f7ec] px-4 py-3 text-xs font-bold uppercase text-[#5a6655]">
        <span>Mitglied</span>
        <span>Punkte</span>
      </div>
      {scores.map((score) => (
        <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm" key={score.userId}>
          <div>
            <div className="font-semibold">{score.displayName}</div>
            <div className="text-xs text-[#6d7669]">
              {score.lastCompletedAt ? `Zuletzt: ${formatDate(score.lastCompletedAt)}` : "Noch kein Dienst"}
            </div>
          </div>
          <div className="text-lg font-bold text-[#2f6b3f]">{score.points}</div>
        </div>
      ))}
    </div>
  );
}
