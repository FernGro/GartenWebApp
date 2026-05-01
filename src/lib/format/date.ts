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

export function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const [datePart, timePart = ""] = value.split("T");
  const date = formatDate(datePart);
  const time = timePart.slice(0, 5);

  return time ? `${date}, ${time}` : date;
}

export function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
