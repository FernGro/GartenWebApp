export type IconName =
  | "home"
  | "tasks"
  | "plus"
  | "chat"
  | "calendar"
  | "euro"
  | "bell"
  | "more"
  | "people"
  | "settings"
  | "help"
  | "template"
  | "forecast"
  | "log"
  | "install";

const paths: Record<IconName, string> = {
  home: "M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  tasks: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  plus: "M12 5v14M5 12h14",
  chat: "M4 5h16v11H9l-5 4z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
  euro: "M17 6.5A6.5 6.5 0 1 0 17 17.5M4 10.5h10M4 13.5h10",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M18 15c2 .5 3 2.5 3 5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .2-1.3-1.3.2-2-3-1-1 2h-1.8l-1-2-3 1 .2 2L6 7.2 4 7l-1 3 2 1v2l-2 1 1 3 2-.2 1.3 1.3-.2 2 3 1 1-2h1.8l1 2 3-1-.2-2 1.3-1.3 2 .2 1-3-2-1z",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01",
  template: "M5 4h14v16H5zM9 8h6M9 12h6M9 16h3",
  forecast: "M7 17a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A4 4 0 1 1 17 17zM9 21l1-2M13 21l1-2",
  log: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h4",
  install: "M12 4v11M7 10l5 5 5-5M5 20h14",
};

export function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <path d={paths[name]} />
    </svg>
  );
}
