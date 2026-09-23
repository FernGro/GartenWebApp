"use client";

import { useMemo, useState } from "react";
import { helpItems, helpRoleLabels, helpTopics, type HelpRole } from "@/lib/help/content";
import type { GardenRole } from "@/types/domain";

const viewerLevels: Record<GardenRole, HelpRole[]> = {
  member: ["Alle"],
  admin: ["Alle", "Owner/Admin"],
  owner: ["Alle", "Owner/Admin", "Owner"],
};

const viewerLabels: Record<GardenRole, string> = {
  member: "Mitglied",
  admin: "Admin",
  owner: "Owner",
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

export function HelpBrowser({ initialRole = "member" }: { initialRole?: GardenRole }) {
  const [query, setQuery] = useState("");
  const [viewer, setViewer] = useState<GardenRole>(initialRole);
  const terms = useMemo(() => normalize(query.trim()).split(/\s+/).filter(Boolean), [query]);

  const filtered = useMemo(() => {
    const allowed = viewerLevels[viewer];
    return helpItems.filter((item) => {
      if (!allowed.includes(item.role)) {
        return false;
      }
      const haystack = normalize([item.title, item.location, item.topic, item.note ?? "", ...item.keywords, ...item.steps].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [terms, viewer]);

  const grouped = helpTopics
    .map((topic) => ({ topic, items: filtered.filter((item) => item.topic === topic) }))
    .filter((group) => group.items.length > 0);

  return (
    <div>
      <div className="z-10 grid md:sticky md:top-16 gap-3 rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf] md:grid-cols-[1fr_auto]">
        <label className="text-sm font-semibold text-[#172016]">
          Wonach suchst du?
          <input
            className="mt-1 w-full rounded-xl border border-[#cbd8c1] px-3 py-3"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="z. B. Urlaub, Abrechnung, einladen, Punkte"
            type="search"
            value={query}
          />
        </label>
        <fieldset>
          <legend className="text-sm font-semibold text-[#172016]">Anzeigen fuer</legend>
          <div className="mt-1 flex gap-1 rounded-xl bg-[#e7efe1] p-1">
            {(Object.keys(viewerLevels) as GardenRole[]).map((role) => (
              <button
                aria-pressed={viewer === role}
                className={`press rounded-lg px-3 py-2 text-sm font-semibold ${viewer === role ? "bg-[#fffef9] text-[#172016] shadow-[0_1px_0_#d7dfcf]" : "text-[#405039]"}`}
                key={role}
                onClick={() => setViewer(role)}
                type="button"
              >
                {viewerLabels[role]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      {!query ? (
        <nav aria-label="Themen" className="mt-4 flex flex-wrap gap-2">
          {grouped.map((group) => (
            <a
              className="rounded-full bg-[#e7efe1] px-3 py-1.5 text-sm font-semibold text-[#2f6b3f] hover:bg-[#d7e6cb]"
              href={`#${encodeURIComponent(group.topic)}`}
              key={group.topic}
            >
              {group.topic}
            </a>
          ))}
        </nav>
      ) : null}

      <div className="mt-6 space-y-8">
        {grouped.map((group) => (
          <section className="scroll-mt-40" id={group.topic} key={group.topic}>
            <h2 className="mb-3 text-2xl font-bold">{group.topic}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.items.map((item) => (
                <details className="group rounded-2xl border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-[0_2px_0_#d7dfcf]" key={item.title} open={terms.length > 0}>
                  <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <span className="font-display text-lg font-bold text-[#172016]">{item.title}</span>
                    <span className="flex shrink-0 flex-wrap gap-1">
                      {item.role !== "Alle" ? (
                        <span className="rounded-full bg-[#fff7e8] px-2 py-1 text-xs font-semibold text-[#6f4d16]">{helpRoleLabels[item.role]}</span>
                      ) : null}
                      <span className="rounded-full bg-[#eef4e8] px-2 py-1 text-xs font-semibold text-[#2f6b3f]">{item.location}</span>
                    </span>
                  </summary>
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-[#42513d]">
                    {item.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {item.note ? <p className="mt-3 rounded-xl bg-[#f8faf3] px-3 py-2 text-sm text-[#405039]">{item.note}</p> : null}
                </details>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#b9d1b0] bg-[#f8faf3] p-6 text-center text-sm text-[#5a6655]">
            Nichts gefunden. Probiere ein anderes Wort, z. B. Dienst, Punkte oder Abrechnung.
          </div>
        ) : null}
      </div>
    </div>
  );
}
