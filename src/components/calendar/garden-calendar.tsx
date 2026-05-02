import Link from "next/link";
import { formatDate } from "@/lib/format/date";
import type { AvailabilityWindow, TaskWithPeople } from "@/types/domain";

function monthDays(year: number, month: number) {
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, index + 1));
    return date.toISOString().slice(0, 10);
  });
}

function dayTasks(day: string, tasks: TaskWithPeople[]) {
  return tasks.filter((task) => task.due_date === day && task.status !== "cancelled");
}

function dayAvailability(day: string, entries: AvailabilityWindow[]) {
  return entries.filter((entry) => entry.from_date <= day && entry.to_date >= day);
}

export function GardenCalendar({
  tasks,
  availability,
  year,
  month,
}: {
  tasks: TaskWithPeople[];
  availability: AvailabilityWindow[];
  year: number;
  month: number;
}) {
  const days = monthDays(year, month);
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const label = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );

  return (
    <section className="rounded-lg border border-[#d7dfcf] bg-[#fffef9] shadow-sm shadow-[#4a5d3f]/5">
      <div className="flex flex-col gap-3 border-b border-[#d7dfcf] bg-[#eef6e8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold capitalize">{label}</h2>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Link className="rounded-lg bg-white px-3 py-2 text-[#2f6b3f]" href={`/calendar?year=${prev.year}&month=${prev.month}`}>
            Zurueck
          </Link>
          <Link className="rounded-lg bg-white px-3 py-2 text-[#2f6b3f]" href={`/calendar?year=${next.year}&month=${next.month}`}>
            Weiter
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-[#d7dfcf] text-xs font-bold uppercase text-[#5a6655]">
        {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((weekday) => (
          <div className="bg-[#f8faf3] px-2 py-2 text-center" key={weekday}>{weekday}</div>
        ))}
      </div>
      <div className="grid gap-px bg-[#d7dfcf] sm:grid-cols-7">
        {days.map((day) => {
          const tasksForDay = dayTasks(day, tasks);
          const blocked = dayAvailability(day, availability);

          return (
            <div className="min-h-28 bg-[#fffef9] p-2" key={day}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="font-bold text-[#172016]">{day.slice(-2)}</span>
                <span className="text-[11px] text-[#6d7669]">{formatDate(day).slice(0, 6)}</span>
              </div>
              <div className="space-y-1">
                {tasksForDay.slice(0, 3).map((task) => (
                  <Link
                    className="block rounded-md bg-[#e7efe1] px-2 py-1 text-xs font-semibold text-[#2f6b3f]"
                    href={`/tasks/${task.id}`}
                    key={task.id}
                  >
                    {task.title}
                  </Link>
                ))}
                {tasksForDay.length > 3 ? <div className="text-xs text-[#6d7669]">+{tasksForDay.length - 3} weitere</div> : null}
                {blocked.slice(0, 2).map((entry) => (
                  <div className="rounded-md bg-[#fff0d9] px-2 py-1 text-xs font-semibold text-[#915b10]" key={entry.id ?? `${entry.user_id}-${entry.from_date}`}>
                    {entry.profiles?.display_name ?? "Mitglied"} weg
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
