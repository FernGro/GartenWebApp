import test from "node:test";
import assert from "node:assert/strict";
import { applyMembershipHistory } from "../../src/lib/planning/membership-scores.ts";

function member(userId, slotId, joinedOn, leftOn = null) {
  return { user_id: userId, slot_id: slotId, joined_on: joinedOn, left_on: leftOn, is_active: leftOn === null };
}

function score(userId, points) {
  return { userId, displayName: userId, points, lastCompletedAt: null };
}

function done(userId, points) {
  return { status: "done", completed_by: userId, points };
}

test("a successor inherits the points of predecessors on the same place", () => {
  const history = [member("alt", "s1", "2026-01-01", "2026-08-31"), member("neu", "s1", "2026-09-01"), member("carla", "s2", "2026-01-01")];
  const tasks = [done("alt", 40), done("neu", 2), done("carla", 45)];
  const result = applyMembershipHistory([score("neu", 2), score("carla", 45)], tasks, history, "2026-09-23");

  assert.equal(result.find((row) => row.userId === "neu").points, 42);
  assert.equal(result.find((row) => row.userId === "carla").points, 45);
});

test("an additional newcomer starts as if present since the garden start at average pace", () => {
  const history = [member("anna", "s1", "2026-01-01"), member("ben", "s2", "2026-01-01"), member("dora", "s3", "2026-07-01")];
  const tasks = [done("anna", 90), done("ben", 90)];
  const result = applyMembershipHistory([score("anna", 90), score("ben", 90), score("dora", 0)], tasks, history, "2026-12-31");
  const dora = result.find((row) => row.userId === "dora").points;

  assert.ok(dora >= 40 && dora <= 60, `dora baseline ${dora} should be about half a year of average work`);
});

test("without history scores stay unchanged", () => {
  const scores = [score("anna", 10)];
  assert.deepEqual(applyMembershipHistory(scores, [], [], "2026-09-23"), scores);
});

test("only the newest active member of a place inherits predecessor points", () => {
  const history = [member("alt", "s1", "2026-01-01", "2026-08-31"), member("b", "s1", "2026-09-01"), member("c", "s1", "2026-09-10")];
  const tasks = [done("alt", 40)];
  const result = applyMembershipHistory([score("b", 0), score("c", 0)], tasks, history, "2026-09-23");

  assert.equal(result.find((row) => row.userId === "c").points, 40);
  assert.equal(result.find((row) => row.userId === "b").points, 0);
});
