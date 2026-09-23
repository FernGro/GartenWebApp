import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#b9d1b0] bg-[#f8faf3] px-6 py-8 text-center">
      <svg aria-hidden="true" className="mx-auto h-10 w-10 text-[#8fb36b]" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 40 40">
        <path d="M8 34c2-8 1-14-1-20M16 34c1-7 3-12 8-16M24 34c0-6 2-10 8-13M32 34c0-3 1-6 3-8" />
      </svg>
      <h2 className="mt-2 text-lg font-bold text-[#172016]">{title}</h2>
      <div className="mt-1 text-sm text-[#5a6655]">{children}</div>
    </div>
  );
}
