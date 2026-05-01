import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#cbd8c1] bg-[#fffef9]/80 p-6 text-center">
      <h2 className="text-base font-semibold text-[#172016]">{title}</h2>
      <div className="mt-2 text-sm text-[#5a6655]">{children}</div>
    </div>
  );
}
