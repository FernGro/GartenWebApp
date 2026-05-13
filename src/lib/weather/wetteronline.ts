export type WetterOnlineDay = {
  date: string;
  label: string;
  minTemperature: number | null;
  maxTemperature: number | null;
  sunHours: number | null;
  precipitationProbability: number | null;
};

export type WeatherForecast = {
  location: string;
  sourceUrl: string;
  days: WetterOnlineDay[];
  note?: string;
};

export type WeatherRating = WetterOnlineDay & {
  score: number;
  summary: string;
  rainRisk: "niedrig" | "mittel" | "hoch";
  snowRisk: "niedrig" | "moeglich" | "hoch";
};

const REQUEST_HEADERS = {
  "user-agent": "Mozilla/5.0 (compatible; GartenDienstplan/1.0)",
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
};

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

async function fetchText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      redirect: "manual",
      signal: controller.signal,
      next: { revalidate: 60 * 60 },
    });
    if (!response.ok && response.status >= 400) return null;
    return await response.text();
  } catch (error) {
    console.error("wetteronline fetch", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function resolveForecastDate(label: string, today: string) {
  const match = label.match(/(\d{1,2})\.(\d{1,2})\./);
  if (!match) return null;

  const todayDate = new Date(`${today}T00:00:00Z`);
  let year = todayDate.getUTCFullYear();
  const month = Number(match[2]);
  const day = Number(match[1]);
  let candidate = new Date(Date.UTC(year, month - 1, day));

  if (candidate.getTime() < todayDate.getTime() - 30 * 86_400_000) {
    year += 1;
    candidate = new Date(Date.UTC(year, month - 1, day));
  }

  return candidate.toISOString().slice(0, 10);
}

function extractTableRowValues(markup: string, rowSelector: string) {
  const rowPattern = rowSelector.startsWith("#")
    ? new RegExp(`<tr[^>]+id=["']${rowSelector.slice(1)}["'][\\s\\S]*?<\\/tr>`, "i")
    : new RegExp(`<tr[^>]+class=["'][^"']*${rowSelector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"']*["'][\\s\\S]*?<\\/tr>`, "i");
  const row = markup.match(rowPattern)?.[0] ?? "";
  return [...row.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => Number(stripTags(match[1]).match(/-?\d+/)?.[0] ?? NaN))
    .filter(Number.isFinite);
}

function parseForecast(markup: string, today: string): WetterOnlineDay[] {
  const daterow = markup.match(/<table[^>]+id=["']daterow["'][\s\S]*?<\/table>/i)?.[0] ?? "";
  const labels = [...daterow.matchAll(/<th[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/th>/gi)]
    .map((match) => stripTags(match[1]).split(", ").pop() ?? "")
    .filter(Boolean);

  if (labels.length === 0) return [];

  const maxValues = extractTableRowValues(markup, "Maximum Temperature");
  const minValues = extractTableRowValues(markup, "Minimum Temperature");
  const sunValues = extractTableRowValues(markup, "#sun_teaser");
  const precipitationValues = extractTableRowValues(markup, "#precipitation_teaser");

  return labels.map((label, index) => ({
    date: resolveForecastDate(label, today) ?? addDays(today, index),
    label,
    minTemperature: minValues[index] ?? null,
    maxTemperature: maxValues[index] ?? null,
    sunHours: sunValues[index] ?? null,
    precipitationProbability: precipitationValues[index] ?? null,
  }));
}

function findLocationUrl(markup: string) {
  const href = markup.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1];
  if (!href) return null;
  const cleaned = decodeHtml(href).replace(/^\//, "");
  return cleaned.startsWith("wetter/") || cleaned.startsWith("?gid") ? cleaned : null;
}

export async function getWetterOnlineForecast(location: string | null | undefined, today = new Date().toISOString().slice(0, 10)): Promise<WeatherForecast | null> {
  const configuredLocation = (location || process.env.WETTERONLINE_LOCATION || "").trim();
  if (!configuredLocation) return null;

  let locationUrl = configuredLocation;
  if (!locationUrl.startsWith("wetter/") && !locationUrl.startsWith("?gid")) {
    const search = await fetchText(`https://www.wetteronline.de/search?ireq=true&pid=p_search&searchstring=${encodeURIComponent(locationUrl)}`);
    locationUrl = search ? findLocationUrl(search) ?? "" : "";
  }

  if (!locationUrl) {
    return {
      location: configuredLocation,
      sourceUrl: "https://www.wetteronline.de",
      days: [],
      note: "WetterOnline konnte den Wetterort nicht zuordnen.",
    };
  }

  const sourceUrl = `https://www.wetteronline.de/${locationUrl}`;
  const markup = await fetchText(sourceUrl);
  if (!markup) {
    return {
      location: configuredLocation,
      sourceUrl,
      days: [],
      note: "WetterOnline ist gerade nicht erreichbar.",
    };
  }

  const days = parseForecast(decodeHtml(markup), today);
  return {
    location: configuredLocation,
    sourceUrl,
    days,
    note: days.length === 0 ? "WetterOnline lieferte keine auswertbare Tagesvorschau." : undefined,
  };
}

function taskKind(title: string) {
  const normalized = title.toLowerCase();
  if (/schnee|winter|eis|streu|salz/.test(normalized)) return "snow";
  if (/gieß|giess|wasser|bewässer|bewaesser/.test(normalized)) return "watering";
  if (/rasen|mähen|maehen|mäh/.test(normalized)) return "mowing";
  if (/laub|kehren|fegen|schnitt|hecke|beet|unkraut|jäten|jaeten/.test(normalized)) return "dry";
  return "general";
}

function rainRisk(probability: number | null) {
  if (probability === null) return "mittel";
  if (probability >= 70) return "hoch";
  if (probability >= 35) return "mittel";
  return "niedrig";
}

function snowRisk(day: WetterOnlineDay) {
  const precipitation = day.precipitationProbability ?? 0;
  const max = day.maxTemperature ?? 99;
  const min = day.minTemperature ?? 99;
  if (precipitation >= 60 && max <= 2) return "hoch";
  if (precipitation >= 40 && min <= 1) return "moeglich";
  return "niedrig";
}

function rateDay(day: WetterOnlineDay, kind: ReturnType<typeof taskKind>): WeatherRating {
  const precipitation = day.precipitationProbability ?? 50;
  const sun = day.sunHours ?? 3;
  const max = day.maxTemperature ?? 12;
  const min = day.minTemperature ?? 6;
  const snow = snowRisk(day);
  let score = 60;
  const reasons: string[] = [];

  if (kind === "snow") {
    score = snow === "hoch" ? 95 : snow === "moeglich" ? 80 : 45;
    if (snow !== "niedrig") reasons.push("Schneerisiko");
    if (min <= 0) reasons.push("Frost");
  } else if (kind === "watering") {
    score = 55 + Math.max(0, max - 18) * 2 - precipitation * 0.45 + Math.max(0, sun - 4) * 2;
    if (precipitation <= 25) reasons.push("trocken");
    if (max >= 24) reasons.push("warm");
    if (precipitation >= 60) reasons.push("Regen macht Giessen weniger sinnvoll");
  } else {
    score = 80 - precipitation * 0.65 + sun * 2;
    if (precipitation <= 30) reasons.push("wenig Regen");
    if (sun >= 4) reasons.push("helles Zeitfenster");
    if (precipitation >= 60) reasons.push("viel Regen");
    if (snow !== "niedrig") reasons.push("Schnee/Frost beachten");
  }

  if (kind === "mowing" && precipitation >= 45) {
    score -= 20;
    reasons.push("Rasen eher nass");
  }

  return {
    ...day,
    score: Math.round(Math.max(0, Math.min(100, score))),
    rainRisk: rainRisk(day.precipitationProbability),
    snowRisk: snow,
    summary: reasons.length > 0 ? reasons.join(", ") : "neutral",
  };
}

export function rateWeatherDayForTask(day: WetterOnlineDay, taskTitle: string): WeatherRating {
  return rateDay(day, taskKind(taskTitle));
}

export function weatherSymbol(day: Pick<WeatherRating, "rainRisk" | "snowRisk" | "sunHours">) {
  if (day.snowRisk === "hoch") return "❄";
  if (day.snowRisk === "moeglich") return "☃";
  if (day.rainRisk === "hoch") return "☔";
  if (day.rainRisk === "mittel") return "☁";
  if ((day.sunHours ?? 0) >= 5) return "☀";
  return "◐";
}

export function formatWeatherRecommendation(params: {
  forecast: WeatherForecast | null;
  taskTitle: string;
  dueDate: string | null;
  today?: string;
}) {
  const today = params.today ?? new Date().toISOString().slice(0, 10);
  const endDate = params.dueDate ? addDays(params.dueDate, 5) : addDays(today, 5);

  if (!params.forecast) {
    return "Wettervorschau: kein Wetterort konfiguriert.";
  }

  if (params.forecast.days.length === 0) {
    return `Wettervorschau: ${params.forecast.note ?? "keine Daten verfuegbar"}`;
  }

  const kind = taskKind(params.taskTitle);
  const relevantDays = params.forecast.days
    .filter((day) => day.date >= today && day.date <= endDate)
    .map((day) => rateDay(day, kind));
  const days = relevantDays.length > 0 ? relevantDays : params.forecast.days.map((day) => rateDay(day, kind));
  const best = [...days].sort((a, b) => b.score - a.score)[0];
  const rows = days.slice(0, 6).map((day) => {
    const temp = day.minTemperature !== null && day.maxTemperature !== null ? `${day.minTemperature}-${day.maxTemperature}C` : "Temp. ?";
    const rain = day.precipitationProbability !== null ? `${day.precipitationProbability}% Regen` : "Regen ?";
    const sun = day.sunHours !== null ? `${day.sunHours}h Sonne` : "Sonne ?";
    const marker = day.date === best.date ? ">>" : "  ";
    return `${marker} ${day.label}: ${temp}, ${rain}, Schnee ${day.snowRisk}, ${sun} (${day.summary})`;
  });

  return [
    "Wettervorschau fuer den Dienst:",
    ...rows,
    `Empfehlung: ${best.label} wirkt am besten (${best.summary}, Score ${best.score}/100).`,
    params.forecast.note ? `Hinweis: ${params.forecast.note}` : null,
  ].filter(Boolean).join("\n");
}
