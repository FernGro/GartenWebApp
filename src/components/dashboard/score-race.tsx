import type { ScoreRow } from "@/types/domain";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function ScoreRace({ scores }: { scores: ScoreRow[] }) {
  const maxPoints = Math.max(1, ...scores.map((score) => score.points));
  const leaders = [...scores].sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName)).slice(0, 3);

  if (scores.length === 0) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5">
      <div className="border-b border-[#d7dfcf] bg-[#eef6e8] px-4 py-3">
        <h2 className="text-lg font-bold">Rasenmaeher-Rennen</h2>
        <p className="mt-1 text-sm text-[#5a6655]">Mehr Punkte bedeuten mehr erledigte Gartenarbeit. Fuer Fairness wird trotzdem die Person mit wenig Punkten bevorzugt.</p>
      </div>
      <div className="space-y-4 p-4">
        {scores
          .slice()
          .sort((a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName))
          .map((score, index) => {
            const width = Math.max(12, Math.round((score.points / maxPoints) * 100));
            return (
              <div className="race-row" key={score.userId}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#172016]">{score.displayName}</span>
                  <span className="rounded-full bg-[#eef4e8] px-2 py-1 text-xs font-bold text-[#2f6b3f]">{score.points} Pkt.</span>
                </div>
                <div className="relative h-10 overflow-hidden rounded-lg border border-[#c6d7bd] bg-[#dcebcf]">
                  <div className="absolute inset-x-0 bottom-0 h-3 bg-[repeating-linear-gradient(90deg,#86aa68_0_16px,#719c55_16px_32px)]" />
                  <div
                    className="race-lane absolute inset-y-0 left-0 rounded-r-lg bg-[#b8d99f]"
                    style={{ width: `${width}%`, animationDelay: `${index * 80}ms` }}
                  />
                  <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `calc(${width}% - 30px)` }}>
                    <svg aria-hidden="true" className="h-8 w-12" viewBox="0 0 80 48">
                      <path d="M10 28h38l12-13h8L58 36H12z" fill={index === 0 ? "#2f6b3f" : "#58774b"} />
                      <path d="M20 15h22l6 13H13z" fill={index === 0 ? "#8fb36b" : "#9cad90"} />
                      <circle cx="23" cy="37" fill="#172016" r="6" />
                      <circle cx="52" cy="37" fill="#172016" r="6" />
                    </svg>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      <div className="grid grid-cols-3 items-end gap-2 border-t border-[#d7dfcf] bg-[#f8faf3] px-4 py-4">
        {[leaders[1], leaders[0], leaders[2]].map((leader, index) => {
          const place = index === 1 ? 1 : index === 0 ? 2 : 3;
          const height = index === 1 ? "h-20" : index === 0 ? "h-14" : "h-11";
          return (
            <div className="flex flex-col items-center justify-end gap-2" key={leader?.userId ?? index}>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#2f6b3f] text-xs font-bold text-white">
                {leader ? initials(leader.displayName) : "-"}
              </div>
              <div className={`grid w-full place-items-center rounded-t-lg bg-[#d2a24c] text-sm font-bold text-white ${height}`}>
                {place}
              </div>
              <div className="max-w-full truncate text-xs font-semibold text-[#405039]">{leader?.displayName ?? "frei"}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
