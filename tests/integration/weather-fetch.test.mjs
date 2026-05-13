import test from "node:test";
import assert from "node:assert/strict";
import { getWetterOnlineForecast } from "../../src/lib/weather/wetteronline.ts";

test("fetches a usable forecast for Murnau am Staffelsee", async () => {
  const forecast = await getWetterOnlineForecast("Murnau am Staffelsee", new Date().toISOString().slice(0, 10));

  assert.ok(forecast);
  assert.ok(forecast.days.length >= 7, forecast.note ?? "expected at least 7 forecast days");
  assert.ok(forecast.days[0].date);
  assert.notEqual(forecast.days[0].precipitationProbability, null);
});
