"use client";

import { useMemo, useState } from "react";
import { helpItems, helpRoles, type HelpRole } from "@/lib/help/content";

export function HelpBrowser() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<HelpRole>("Alle");
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return helpItems.filter((item) => {
      const roleMatches = role === "Alle" || item.role === role || item.role === "Alle";
      const haystack = [item.title, item.location, item.role, item.note ?? "", ...item.keywords, ...item.steps]
        .join(" ")
        .toLowerCase();
      return roleMatches && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [normalizedQuery, role]);

  const grouped = helpRoles.map((entryRole) => ({
    role: entryRole,
    items: filtered.filter((item) => item.role === entryRole),
  })).filter((group) => group.items.length > 0);

  return (
    <div>
      <div className="grid gap-3 rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5 md:grid-cols-[220px_1fr]">
        <label className="text-sm font-semibold text-[#172016]">
          Rolle
          <select
            className="mt-1 w-full rounded-lg border border-[#cbd8c1] bg-white px-3 py-3"
            value={role}
            onChange={(event) => setRole(event.target.value as HelpRole)}
          >
            {helpRoles.map((entryRole) => (
              <option key={entryRole} value={entryRole}>{entryRole}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-[#172016]">
          Suche
          <input
            className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3"
            placeholder="z. B. Wetter, Uebernahme, Abwesenheit"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-5 space-y-6">
        {grouped.map((group) => (
          <section key={group.role}>
            <h2 className="mb-3 text-xl font-bold">{group.role}</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.items.map((item) => (
                <article className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5" key={`${item.role}-${item.title}`}>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="text-base font-bold text-[#172016]">{item.title}</h3>
                    <span className="rounded-full bg-[#eef4e8] px-2 py-1 text-xs font-semibold text-[#2f6b3f]">{item.location}</span>
                  </div>
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-[#42513d]">
                    {item.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                  {item.note ? <p className="mt-3 rounded-lg bg-[#fff7e8] px-3 py-2 text-xs text-[#915b10]">{item.note}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-6 text-sm text-[#5a6655]">
            Keine Hilfe gefunden.
          </div>
        ) : null}
      </div>
    </div>
  );
}
