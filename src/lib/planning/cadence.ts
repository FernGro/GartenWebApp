import type { RecurrenceType, TaskTemplate } from "@/types/domain";

export type CadenceRule = {
  intervalDays: number;
  minGapDays: number;
  label: string;
};

const titleRules: Array<{ pattern: RegExp; rule: CadenceRule }> = [
  {
    pattern: /rasen|maeh|mäh|mulch/i,
    rule: { intervalDays: 21, minGapDays: 14, label: "Mulcher: alle 2-3 Wochen in der Saison" },
  },
  {
    pattern: /unkraut|jäten|jaeten|beet/i,
    rule: { intervalDays: 60, minGapDays: 45, label: "Unkraut: ca. alle 2 Monate" },
  },
  {
    pattern: /blatt|laub/i,
    rule: { intervalDays: 30, minGapDays: 21, label: "Laub: monatlich im Herbst" },
  },
  {
    pattern: /hecke/i,
    rule: { intervalDays: 120, minGapDays: 90, label: "Hecke: wenige gezielte Termine pro Saison" },
  },
  {
    pattern: /schnee/i,
    rule: { intervalDays: 14, minGapDays: 7, label: "Schnee: nur bei Bedarf" },
  },
];

function recurrenceDays(type: RecurrenceType, interval: number) {
  if (type === "weekly") {
    return interval * 7;
  }

  if (type === "monthly" || type === "seasonal") {
    return interval * 30;
  }

  return 30;
}

export function getCadenceRule(template: TaskTemplate): CadenceRule {
  const titleRule = titleRules.find((entry) => entry.pattern.test(template.title));

  if (titleRule) {
    return titleRule.rule;
  }

  const intervalDays = recurrenceDays(template.recurrence_type, template.recurrence_interval);

  return {
    intervalDays,
    minGapDays: Math.max(7, Math.floor(intervalDays * 0.7)),
    label: `${template.recurrence_interval} ${template.recurrence_type}`,
  };
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function diffDays(a: string, b: string) {
  const first = new Date(`${a}T00:00:00.000Z`).getTime();
  const second = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((second - first) / (24 * 60 * 60 * 1000));
}
