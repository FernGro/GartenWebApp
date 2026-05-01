import { deleteAvailabilityAction, createAvailabilityAction } from "@/lib/availability/actions";
import { formatDate } from "@/lib/format/date";
import type { AvailabilityWindow } from "@/types/domain";
import { Button } from "@/components/ui/button";

function monthDays() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(year, month, index + 1);
    return date.toISOString().slice(0, 10);
  });
}

function isBlocked(date: string, entries: AvailabilityWindow[]) {
  return entries.some((entry) => entry.from_date <= date && entry.to_date >= date);
}

export function AvailabilityCalendar({
  gardenId,
  entries,
}: {
  gardenId: string;
  entries: AvailabilityWindow[];
}) {
  const days = monthDays();

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Abwesenheit eintragen</h2>
        <form action={createAvailabilityAction} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="garden_id" type="hidden" value={gardenId} />
          <label className="text-sm font-semibold">
            Von
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="from_date" required type="date" />
          </label>
          <label className="text-sm font-semibold">
            Bis
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="to_date" required type="date" />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Grund
            <input className="mt-1 w-full rounded-lg border border-[#cbd8c1] px-3 py-3" name="reason" placeholder="Urlaub, keine Zeit, beschaeftigt" />
          </label>
          <Button className="sm:col-span-2" type="submit">Speichern</Button>
        </form>
        <div className="mt-5 grid grid-cols-7 gap-1">
          {days.map((day) => (
            <div
              className={`rounded-md px-1 py-2 text-center text-xs font-semibold ${
                isBlocked(day, entries) ? "bg-[#f4efe1] text-[#915b10]" : "bg-[#eef4e8] text-[#405039]"
              }`}
              key={day}
              title={formatDate(day)}
            >
              {day.slice(-2)}
            </div>
          ))}
        </div>
      </section>
      <aside className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] p-4 shadow-sm shadow-[#4a5d3f]/5">
        <h2 className="text-lg font-bold">Eintraege</h2>
        <div className="mt-3 space-y-3">
          {entries.map((entry) => (
            <div className="rounded-lg bg-[#f2f7ec] p-3" key={entry.id}>
              <div className="text-sm font-semibold">{entry.profiles?.display_name ?? "Mitglied"}</div>
              <div className="text-xs text-[#6d7669]">
                {formatDate(entry.from_date)} bis {formatDate(entry.to_date)}
              </div>
              {entry.reason ? <div className="mt-1 text-sm text-[#42513d]">{entry.reason}</div> : null}
              <form action={deleteAvailabilityAction} className="mt-2">
                <input name="id" type="hidden" value={entry.id} />
                <Button variant="ghost" type="submit">Loeschen</Button>
              </form>
            </div>
          ))}
          {entries.length === 0 ? <p className="text-sm text-[#6d7669]">Noch keine Abwesenheiten.</p> : null}
        </div>
      </aside>
    </div>
  );
}
