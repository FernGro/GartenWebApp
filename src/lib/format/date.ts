export function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const [datePart] = value.split("T");
  const [year, month, day] = datePart.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return `${day}.${month}.${year}`;
}

const appTimeZone = "Europe/Berlin";

function toAppTimeZoneIso(value: string) {
  const date = new Date(value);

  if (!value.includes("T") || Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);

  return parts.replace(" ", "T");
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const [datePart, timePart = ""] = toAppTimeZoneIso(value).split("T");
  const date = formatDate(datePart);
  const time = timePart.slice(0, 5);

  return time ? `${date}, ${time}` : date;
}

export function todayIsoDate(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: appTimeZone }).format(now);
}

export function addDaysIso(value: string, days: number) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
