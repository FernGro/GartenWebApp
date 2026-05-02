import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MobileMenu, type NavItem } from "@/components/layout/mobile-menu";

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Aufgaben" },
  { href: "/tasks/new", label: "Neu" },
  { href: "/templates", label: "Vorlagen" },
  { href: "/forecast", label: "Forecast" },
  { href: "/billing", label: "Abrechnung" },
  { href: "/notifications", label: "Meldungen" },
  { href: "/log", label: "Log" },
  { href: "/settings/garden", label: "Garten" },
  { href: "/settings/members", label: "Mitglieder" },
  { href: "/install", label: "Install" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

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
                className="rounded-md px-3 py-2 text-sm font-medium text-[#405039] hover:bg-[#e3ecd9]"
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="hidden max-w-40 truncate text-xs text-[#5a6655] sm:block">{user?.email ?? "Setup"}</div>
          <MobileMenu items={navItems} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">{children}</main>
    </div>
  );
}
