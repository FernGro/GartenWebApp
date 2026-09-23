import test from "node:test";
import assert from "node:assert/strict";
import { hasTemplateTaskWithinInterval } from "../../src/lib/planning/cadence.ts";
import { formatDateTime, todayIsoDate } from "../../src/lib/format/date.ts";

const lawnTasks = [{ template_id: "lawn", status: "assigned", due_date: "2026-06-22" }];

test("skips a new template task while the previous one is less than one interval away", () => {
  assert.equal(hasTemplateTaskWithinInterval(lawnTasks, "lawn", "2026-07-06", 21), true);
  assert.equal(hasTemplateTaskWithinInterval(lawnTasks, "lawn", "2026-07-13", 21), false);
});

test("counts done tasks but ignores cancelled tasks and other templates", () => {
  const done = [{ template_id: "lawn", status: "done", due_date: "2026-06-22" }];
  const cancelled = [{ template_id: "lawn", status: "cancelled", due_date: "2026-06-22" }];
  assert.equal(hasTemplateTaskWithinInterval(done, "lawn", "2026-07-06", 21), true);
  assert.equal(hasTemplateTaskWithinInterval(cancelled, "lawn", "2026-07-06", 21), false);
  assert.equal(hasTemplateTaskWithinInterval(lawnTasks, "hedge", "2026-07-06", 21), false);
});

test("today uses German local date, not UTC", () => {
  assert.equal(todayIsoDate(new Date("2026-09-22T23:30:00.000Z")), "2026-09-23");
  assert.equal(todayIsoDate(new Date("2026-01-10T22:59:00.000Z")), "2026-01-10");
});

test("timestamps are shown in German local time", () => {
  assert.equal(formatDateTime("2026-09-23T06:15:00.000Z"), "23.09.2026, 08:15");
  assert.equal(formatDateTime("2026-09-23"), "23.09.2026");
});
