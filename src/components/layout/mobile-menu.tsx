"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icons";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
};

function Badge({ count }: { count: number }) {
  return (
    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileTabBar({ primary, more }: { primary: NavItem[]; more: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const moreActive = more.some((item) => isActive(pathname, item.href));
  const moreBadge = more.reduce((sum, item) => sum + (item.badge ?? 0), 0);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      {open ? (
        <>
          <button aria-label="Menue schliessen" className="fixed inset-0 z-30 bg-[#172016]/30" onClick={() => setOpen(false)} type="button" />
          <div className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-40 rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-2 shadow-xl shadow-[#172016]/15">
            <nav aria-label="Weitere Seiten" className="grid grid-cols-3 gap-1">
              {more.map((item) => (
                <Link
                  className={`press relative flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-semibold ${
                    isActive(pathname, item.href) ? "bg-[#e7efe1] text-[#2f6b3f]" : "text-[#405039]"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="h-6 w-6" name={item.icon} />
                  {item.label}
                  {item.badge ? <span className="absolute right-3 top-2"><Badge count={item.badge} /></span> : null}
                </Link>
              ))}
            </nav>
          </div>
        </>
      ) : null}
      <nav
        aria-label="Hauptnavigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d7dfcf] bg-[#fffef9]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="mx-auto grid max-w-md grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            if (item.icon === "plus") {
              return (
                <Link aria-label={item.label} className="press flex items-center justify-center py-2" href={item.href} key={item.href}>
                  <span className="grid h-12 w-12 -translate-y-3 place-items-center rounded-2xl bg-[#2f6b3f] text-white shadow-[0_3px_0_#1f4a2b]">
                    <Icon className="h-6 w-6" name="plus" />
                  </span>
                </Link>
              );
            }
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`press relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-[#2f6b3f]" : "text-[#5a6655]"}`}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-6 w-6" name={item.icon} />
                {item.label}
                {item.badge ? <span className="absolute right-[22%] top-1"><Badge count={item.badge} /></span> : null}
              </Link>
            );
          })}
          <button
            aria-expanded={open}
            className={`press relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${open || moreActive ? "text-[#2f6b3f]" : "text-[#5a6655]"}`}
            onClick={() => setOpen((value) => !value)}
            type="button"
          >
            <Icon className="h-6 w-6" name="more" />
            Mehr
            {moreBadge > 0 && !open ? <span className="absolute right-[22%] top-1"><Badge count={moreBadge} /></span> : null}
          </button>
        </div>
      </nav>
    </div>
  );
}

export function DesktopNav({ primary, more }: { primary: NavItem[]; more: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 md:flex">
      {primary.filter((item) => item.icon !== "plus").map((item) => (
        <Link
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className={`relative rounded-xl px-3 py-2 text-sm font-semibold ${
            isActive(pathname, item.href) ? "bg-[#e7efe1] text-[#2f6b3f]" : "text-[#405039] hover:bg-[#eef4e8]"
          }`}
          href={item.href}
          key={item.href}
        >
          {item.label}
          {item.badge ? <span className="absolute -right-1 -top-1"><Badge count={item.badge} /></span> : null}
        </Link>
      ))}
      <div className="relative">
        <button
          aria-expanded={open}
          className="rounded-xl px-3 py-2 text-sm font-semibold text-[#405039] hover:bg-[#eef4e8]"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          Mehr
        </button>
        {open ? (
          <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-1.5 shadow-xl shadow-[#172016]/10">
            {more.map((item) => (
              <Link
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#405039] hover:bg-[#eef4e8]"
                href={item.href}
                key={item.href}
              >
                <Icon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? <Badge count={item.badge} /> : null}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
