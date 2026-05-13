import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { getUnreadChatCount } from "@/lib/chat/queries";
import { MobileMenu, type NavItem } from "@/components/layout/mobile-menu";

const baseNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Aufgaben" },
  { href: "/tasks/new", label: "Neu" },
  { href: "/templates", label: "Vorlagen" },
  { href: "/forecast", label: "Forecast" },
  { href: "/calendar", label: "Kalender" },
  { href: "/billing", label: "Abrechnung" },
  { href: "/notifications", label: "Meldungen" },
  { href: "/chat", label: "Chat" },
  { href: "/log", label: "Log" },
  { href: "/settings/garden", label: "Garten" },
  { href: "/settings/members", label: "Mitglieder" },
  { href: "/help", label: "Hilfe" },
  { href: "/install", label: "Install" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const garden = supabase && user ? await getCurrentGarden(supabase) : null;

  const unreadChat = supabase && garden && user
    ? await getUnreadChatCount(supabase, garden.id, user.id)
    : 0;

  const navItems: NavItem[] = baseNavItems.map((item) =>
    item.href === "/chat" && unreadChat > 0
      ? { ...item, badge: unreadChat }
      : item,
  );

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-[#d7dfcf] bg-[#f8faf3]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link className="flex items-center gap-2 text-base font-bold text-[#172016]" href="/dashboard">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#2f6b3f] text-white">GD</span>
            <span>Garten Dienstplan</span>
          </Link>
          <nav className="hidden gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                className="relative rounded-md px-3 py-2 text-sm font-medium text-[#405039] hover:bg-[#e3ecd9]"
                href={item.href}
                key={item.href}
              >
                {item.label}
                {item.badge ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="hidden max-w-40 truncate text-xs text-[#5a6655] sm:block">{user?.email ?? "Setup"}</div>
          <MobileMenu items={navItems} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">{children}</main>
      <footer className="border-t border-[#d7dfcf] bg-[#f8faf3]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-[#5a6655] sm:flex-row sm:items-center sm:justify-between">
          <span>Garten Dienstplan</span>
          <div className="flex flex-wrap gap-3 font-semibold">
            <Link className="text-[#2f6b3f]" href="/help">Hilfe</Link>
            <Link className="text-[#2f6b3f]" href="/install">Installieren</Link>
            <Link className="text-[#2f6b3f]" href="/settings/garden">Einstellungen</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
