const iconRules = [
  { match: ["rasen", "maeh", "mäh"], icon: " mower", label: "Rasenmaehen" },
  { match: ["hecke"], icon: " hedge", label: "Hecke schneiden" },
  { match: ["unkraut"], icon: " weed", label: "Unkraut jaeten" },
  { match: ["blatt", "blaetter", "blätter", "laub"], icon: " leaf", label: "Blaetter entfernen" },
  { match: ["schnee"], icon: " snow", label: "Schneeschaufeln" },
  { match: ["giessen", "gießen", "wasser"], icon: " water", label: "Giessen" },
];

function resolveIcon(title: string) {
  const normalized = title.toLowerCase();
  const rule = iconRules.find((item) => item.match.some((term) => normalized.includes(term)));

  return rule ?? { icon: " task", label: "Gartenaufgabe" };
}

const iconPaths: Record<string, ReactNode> = {
  " mower": (
    <>
      <rect x="19" y="30" width="30" height="13" rx="4" />
      <path d="M46 31h10l7 12" />
      <path d="M28 30l-7-12" />
      <circle cx="27" cy="49" r="6" />
      <circle cx="51" cy="49" r="6" />
    </>
  ),
  " hedge": (
    <>
      <path d="M17 47c8-18 29-22 43-8 4 4 5 9 3 13H16c-3-1-3-3 1-5Z" />
      <path d="M25 39c5-8 15-11 24-5" />
      <path d="M20 57h45" />
    </>
  ),
  " weed": (
    <>
      <path d="M40 58V25" />
      <path d="M39 42C27 38 22 29 24 18c11 1 18 8 15 24Z" />
      <path d="M41 46c12-6 18-15 17-27-12 2-20 11-17 27Z" />
      <path d="M28 58h25" />
    </>
  ),
  " leaf": (
    <>
      <path d="M20 43c28 4 41-10 43-28-23 1-42 12-43 28Z" />
      <path d="M22 44c13-9 24-16 39-25" />
      <path d="M28 55c9-3 17-1 23 5" />
    </>
  ),
  " snow": (
    <>
      <path d="M40 16v48" />
      <path d="M19 28l42 24" />
      <path d="M61 28 19 52" />
      <path d="m30 20 10 8 10-8" />
      <path d="m30 60 10-8 10 8" />
    </>
  ),
  " water": (
    <>
      <path d="M40 15c12 15 19 25 19 34 0 11-8 18-19 18s-19-7-19-18c0-9 7-19 19-34Z" />
      <path d="M31 52c2 5 6 8 12 8" />
    </>
  ),
  " task": (
    <>
      <path d="M22 42h15" />
      <path d="M22 55h30" />
      <path d="m44 38 6 6 12-15" />
      <rect x="16" y="16" width="48" height="48" rx="10" />
    </>
  ),
};

export function TaskIcon({ title }: { title: string }) {
  const { icon, label } = resolveIcon(title);

  return (
    <span
      aria-label={label}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#e3ecd9] text-[#2f6b3f]"
      role="img"
    >
      <svg
        aria-hidden="true"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
        viewBox="0 0 80 80"
      >
        {iconPaths[icon]}
      </svg>
    </span>
  );
}
import type { ReactNode } from "react";
