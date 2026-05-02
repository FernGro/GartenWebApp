import type { ScoreRow } from "@/types/domain";

const colors = ["#2f6b3f", "#8fb36b", "#d2a24c", "#6d8db5", "#b66a4d", "#7b6aa8"];

export function ScorePie({ scores }: { scores: ScoreRow[] }) {
  const total = scores.reduce((sum, score) => sum + score.points, 0);

  if (total === 0) {
    return (
      <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 text-sm text-[#6d7669]">
        Noch keine Punkte fuer ein Diagramm.
      </div>
    );
  }

  let cursor = 0;
  const gradient = scores
    .map((score, index) => {
      const start = cursor;
      const end = cursor + (score.points / total) * 100;
      cursor = end;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
      <h2 className="text-lg font-bold">Punkteverteilung</h2>
      <div className="mt-4 grid items-center gap-4 sm:grid-cols-[150px_1fr]">
        <div
          aria-label="Punkteverteilung"
          className="h-36 w-36 rounded-full border-8 border-[#f3f5ec]"
          role="img"
          style={{ background: `conic-gradient(${gradient})` }}
        />
        <div className="space-y-2">
          {scores.map((score, index) => (
            <div className="flex items-center justify-between gap-3 text-sm" key={score.userId}>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                {score.displayName}
              </span>
              <span className="font-semibold">{score.points}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
