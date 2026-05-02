const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function getCompletionWindow(dueDate: string) {
  const earliest = toUtcDate(dueDate);
  earliest.setUTCDate(earliest.getUTCDate() - 7);

  const latest = toUtcDate(dueDate);
  latest.setUTCDate(latest.getUTCDate() + 7);

  return {
    earliest: earliest.toISOString().slice(0, 10),
    latest: latest.toISOString().slice(0, 10),
  };
}

export function isWithinCompletionWindow(dueDate: string, today = new Date().toISOString().slice(0, 10)) {
  const { earliest, latest } = getCompletionWindow(dueDate);
  return today >= earliest && today <= latest;
}

export function daysUntilCompletionWindow(dueDate: string, today = new Date().toISOString().slice(0, 10)) {
  const { earliest } = getCompletionWindow(dueDate);
  return Math.ceil((toUtcDate(earliest).getTime() - toUtcDate(today).getTime()) / DAY_MS);
}
