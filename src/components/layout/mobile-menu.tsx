"use client";

import Link from "next/link";
import { useState } from "react";

export type NavItem = {
  href: string;
  label: string;
};

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        aria-expanded={open}
        aria-label="Menue"
        className="grid h-11 w-11 place-items-center rounded-lg bg-[#e3ecd9] text-[#2f6b3f]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        <span className="text-2xl leading-none">{open ? "×" : "☰"}</span>
      </button>
      {open ? (
        <div className="fixed inset-x-3 top-16 z-20 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-2 shadow-xl shadow-[#172016]/15">
          <nav className="grid grid-cols-2 gap-2">
            {items.map((item) => (
              <Link
                className="rounded-lg bg-[#f2f7ec] px-3 py-3 text-sm font-semibold text-[#405039]"
                href={item.href}
                key={item.href}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
