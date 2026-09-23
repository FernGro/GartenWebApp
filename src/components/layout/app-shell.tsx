import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGarden } from "@/lib/gardens/queries";
import { getUnreadChatCount } from "@/lib/chat/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { DesktopNav, MobileTabBar, type NavItem } from "@/components/layout/mobile-menu";
import { buttonClass } from "@/components/ui/button-styles";
import { Icon } from "@/components/ui/icons";

const allNavItems: NavItem[] = [
  { href: "/dashboard", label: "Uebersicht", icon: "home" },
  { href: "/tasks", label: "Aufgaben", icon: "tasks" },
  { href: "/tasks/new", label: "Neue Aufgabe", icon: "plus" },
  { href: "/chat", label: "Chat", icon: "chat" },
  { href: "/calendar", label: "Kalender", icon: "calendar" },
  { href: "/billing", label: "Abrechnung", icon: "euro" },
  { href: "/notifications", label: "Meldungen", icon: "bell" },
  { href: "/settings/members", label: "Mitglieder", icon: "people" },
  { href: "/templates", label: "Vorlagen", icon: "template" },
  { href: "/forecast", label: "Vorschau", icon: "forecast" },
  { href: "/log", label: "Verlauf", icon: "log" },
  { href: "/settings/garden", label: "Einstellungen", icon: "settings" },
  { href: "/konto", label: "Mein Konto", icon: "user" },
  { href: "/help", label: "Hilfe", icon: "help" },
  { href: "/install", label: "App installieren", icon: "install" },
];

const mobilePrimary = ["/dashboard", "/tasks", "/tasks/new", "/chat"];
const desktopPrimary = ["/dashboard", "/tasks", "/calendar", "/chat", "/billing"];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const garden = supabase && user ? await getCurrentGarden(supabase) : null;

  const unreadChat = supabase && garden && user
    ? await getUnreadChatCount(supabase, garden.id, user.id)
    : 0;
  const unreadNotifications = supabase && garden && user
    ? await getUnreadNotificationCount(supabase, garden.id)
    : 0;

  const navItems: NavItem[] = allNavItems.map((item) =>
    item.href === "/chat" && unreadChat > 0
      ? { ...item, badge: unreadChat }
      : item.href === "/notifications" && unreadNotifications > 0
        ? { ...item, badge: unreadNotifications }
        : item,
  );
  const pick = (hrefs: string[]) => navItems.filter((item) => hrefs.includes(item.href));
  const rest = (hrefs: string[]) => navItems.filter((item) => !hrefs.includes(item.href) && item.href !== "/tasks/new");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[#d7dfcf] bg-[#fffef9]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <Link className="flex items-center gap-2.5 text-[#172016]" href="/dashboard">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#2f6b3f] text-white shadow-[0_2px_0_#1f4a2b]">
              <svg aria-hidden="true" className="h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path d="M4 20c2-6 1-10 0-14M9 20c1-5 2-8 5-11M14 20c0-4 1-7 5-9M19 20c0-2 .5-4 2-5" stroke="#cfe6ba" strokeLinecap="round" strokeWidth="2" />
              </svg>
            </span>
            <span className="font-display text-lg font-bold leading-tight">
              {garden?.name ?? "Garten Dienstplan"}
            </span>
          </Link>
          <DesktopNav more={rest(desktopPrimary)} primary={pick(desktopPrimary)} />
          <div className="flex items-center gap-2">
            <Link
              aria-label={unreadNotifications > 0 ? `Meldungen, ${unreadNotifications} neu` : "Meldungen"}
              className="press relative grid h-10 w-10 place-items-center rounded-xl text-[#405039] hover:bg-[#eef4e8]"
              href="/notifications"
            >
              <Icon name="bell" />
              {unreadNotifications > 0 ? (
                <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </Link>
            <div className="hidden md:block">
              <Link className={buttonClass("primary")} href="/tasks/new">
                <Icon className="h-4 w-4" name="plus" />
                Aufgabe
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 md:pb-16">{children}</main>
      <footer className="hidden border-t border-[#d7dfcf] md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-sm text-[#5a6655]">
          <span>Angemeldet als {user?.email ?? "-"}</span>
          <div className="flex gap-4 font-semibold">
            <Link className="text-[#2f6b3f] hover:underline" href="/help">Hilfe</Link>
            <Link className="text-[#2f6b3f] hover:underline" href="/install">App installieren</Link>
          </div>
        </div>
      </footer>
      <MobileTabBar more={rest(mobilePrimary)} primary={pick(mobilePrimary)} />
    </div>
  );
}
