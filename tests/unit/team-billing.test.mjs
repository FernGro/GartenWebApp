import test from "node:test";
import assert from "node:assert/strict";
import { calculateTeamBilling, presenceDays, splitCents } from "../../src/lib/billing/teams.ts";

const period = { startsOn: "2026-01-01", endsOn: "2026-12-31" };
const settings = { garden_id: "g", hourly_rate_cents: 100, point_hours: 1 };

function member(userId, slotId, joinedOn, leftOn = null, name = userId) {
  return {
    id: `m-${userId}`,
    garden_id: "g",
    user_id: userId,
    role: "member",
    is_active: leftOn === null,
    slot_id: slotId,
    joined_on: joinedOn,
    left_on: leftOn,
    replaces_user_id: null,
    profiles: { id: userId, display_name: name },
  };
}

function doneTask(userId, points, completedAt) {
  return { id: `${userId}-${completedAt}-${points}`, status: "done", completed_by: userId, completed_at: completedAt, points };
}

function payment(from, to, cents, on = "2026-12-01") {
  return { id: `${from}-${to}`, type: "payment", paid_by: from, paid_to: to, amount_cents: cents, occurred_on: on };
}

const alt = member("alt", "slot-1", "2025-01-01", "2026-10-31");
const neu = member("neu", "slot-1", "2026-11-01");
const carla = member("carla", "slot-2", "2025-01-01");
const exampleTasks = [
  doneTask("alt", 20, "2026-05-01T10:00:00.000Z"),
  doneTask("neu", 15, "2026-11-20T10:00:00.000Z"),
  doneTask("carla", 85, "2026-06-01T10:00:00.000Z"),
];

function byUser(result) {
  return Object.fromEntries(result.rows.map((row) => [row.userId, row]));
}

test("presence days are clipped to the period and inclusive", () => {
  assert.equal(presenceDays("2025-01-01", "2026-10-31", period), 304);
  assert.equal(presenceDays("2026-11-01", null, period), 61);
  assert.equal(presenceDays("2027-01-05", null, period), 0);
});

test("splitCents keeps the exact total, also for negative amounts", () => {
  assert.deepEqual(splitCents(-2500, [304, 61]), [-2082, -418]);
  assert.deepEqual(splitCents(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(splitCents(0, [0, 0]), [0, 0]);
});

test("team minus is split by presence time (spec example: roughly 5/6 to 1/6)", () => {
  const result = calculateTeamBilling({ members: [alt, neu, carla], tasks: exampleTasks, transactions: [], adjustments: [], settings, period });
  const rows = byUser(result);
  const slot1 = result.slots.find((slot) => slot.slotId === "slot-1");

  assert.equal(result.potCents, 12000);
  assert.equal(slot1.fairShareCents, 6000);
  assert.equal(slot1.teamBalanceCents, -2500);
  assert.equal(rows.alt.balanceCents, -2082);
  assert.equal(rows.neu.balanceCents, -418);
  assert.equal(rows.carla.balanceCents, 2500);
});

test("payments are transfers: balances always sum to zero", () => {
  const result = calculateTeamBilling({
    members: [alt, neu, carla],
    tasks: exampleTasks,
    transactions: [payment("neu", "carla", 1000)],
    adjustments: [],
    settings,
    period,
  });
  const rows = byUser(result);

  assert.equal(rows.neu.balanceCents, 582);
  assert.equal(rows.carla.balanceCents, 1500);
  assert.equal(result.rows.reduce((sum, row) => sum + row.balanceCents, 0), 0);
});

test("team plus is split by own contribution", () => {
  const tasks = [
    doneTask("alt", 30, "2026-05-01T10:00:00.000Z"),
    doneTask("neu", 50, "2026-11-20T10:00:00.000Z"),
    doneTask("carla", 40, "2026-06-01T10:00:00.000Z"),
  ];
  const result = calculateTeamBilling({ members: [alt, neu, carla], tasks, transactions: [], adjustments: [], settings, period });
  const rows = byUser(result);

  assert.equal(result.slots.find((slot) => slot.slotId === "slot-1").teamBalanceCents, 2000);
  assert.equal(rows.alt.balanceCents, 750);
  assert.equal(rows.neu.balanceCents, 1250);
  assert.equal(rows.carla.balanceCents, -2000);
});

test("a place that joined mid-period gets a proportionally smaller target", () => {
  const anna = member("anna", "slot-a", "2025-01-01");
  const dora = member("dora", "slot-d", "2026-07-02");
  const tasks = [doneTask("anna", 100, "2026-03-01T10:00:00.000Z")];
  const result = calculateTeamBilling({ members: [anna, dora], tasks, transactions: [], adjustments: [], settings, period });
  const rows = byUser(result);

  assert.equal(rows.dora.presenceDays, 183);
  assert.equal(rows.anna.balanceCents + rows.dora.balanceCents, 0);
  assert.ok(rows.dora.balanceCents < 0 && rows.dora.balanceCents > -5000, "dora owes less than half");
});

test("only activity inside the period counts, and members outside the period are left out", () => {
  const gone = member("gone", "slot-x", "2024-01-01", "2025-06-30");
  const tasks = [
    doneTask("carla", 50, "2025-12-31T12:00:00.000Z"),
    doneTask("carla", 10, "2026-01-01T12:00:00.000Z"),
  ];
  const result = calculateTeamBilling({ members: [carla, gone], tasks, transactions: [], adjustments: [], settings, period });

  assert.equal(result.potCents, 1000);
  assert.deepEqual(result.rows.map((row) => row.userId), ["carla"]);
});

test("chains A to B to C share one place", () => {
  const a = member("a", "slot-c", "2025-01-01", "2026-04-30");
  const b = member("b", "slot-c", "2026-05-01", "2026-08-31");
  const c = member("c", "slot-c", "2026-09-01");
  const result = calculateTeamBilling({ members: [a, b, c, carla], tasks: [], transactions: [], adjustments: [], settings, period });

  assert.equal(result.slots.length, 2);
  assert.equal(result.slots.find((slot) => slot.slotId === "slot-c").presenceDays, 365);
});

test("payments without recipient count as expense of the payer", () => {
  const result = calculateTeamBilling({
    members: [carla, neu],
    tasks: [],
    transactions: [{ id: "x", type: "payment", paid_by: "carla", paid_to: null, amount_cents: 600, occurred_on: "2026-12-01" }],
    adjustments: [],
    settings,
    period,
  });

  assert.equal(result.potCents, 600);
  assert.equal(result.rows.reduce((sum, row) => sum + row.balanceCents, 0), 0);
});

test("people without presence but with contributions in the period stay in the billing", () => {
  const early = member("early", "slot-e", "2026-06-01", "2026-05-31");
  const tasks = [doneTask("early", 10, "2026-03-01T10:00:00.000Z")];
  const result = calculateTeamBilling({ members: [early, carla], tasks, transactions: [], adjustments: [], settings, period });

  assert.ok(result.rows.some((row) => row.userId === "early"));
  assert.equal(result.rows.reduce((sum, row) => sum + row.balanceCents, 0), 0);
});
