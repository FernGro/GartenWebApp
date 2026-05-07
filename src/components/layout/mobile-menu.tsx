"use client";

import Link from "next/link";
import { useState } from "react";

export type NavItem = {
  href: string;
  label: string;
  badge?: number;
};

function Badge({ count }: { count: number }) {
  return (
    <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-expanded={open}
        aria-label="Menue"
        className="relative grid h-11 w-11 place-items-center rounded-lg bg-[#e3ecd9] text-[#2f6b3f]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="text-2xl leading-none">{open ? "×" : "☰"}</span>
        {items.some((i) => i.badge) && !open && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
        )}
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-16 z-20 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-2 shadow-xl shadow-[#172016]/15">
          <nav className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <Link
                className="flex items-center justify-between rounded-lg bg-[#f2f7ec] px-3 py-3 text-sm font-semibold text-[#405039]"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
                {item.badge ? <Badge count={item.badge} /> : null}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
