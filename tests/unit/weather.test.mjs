import test from "node:test";
import assert from "node:assert/strict";
import { rateWeatherDayForTask, weatherSymbol } from "../../src/lib/weather/wetteronline.ts";

test("rates snow tasks higher when snowfall is forecast", () => {
  const rating = rateWeatherDayForTask({
    date: "2026-01-10",
    label: "Sa. 10.01.",
    minTemperature: -4,
    maxTemperature: 0,
    sunHours: 1,
    precipitationProbability: 85,
    snowfallCm: 3,
  }, "Schneeschueppen");

  assert.equal(rating.snowRisk, "hoch");
  assert.ok(rating.score >= 90);
  assert.equal(weatherSymbol(rating), "❄");
});

test("rates mowing worse on rainy days", () => {
  const wet = rateWeatherDayForTask({
    date: "2026-06-10",
    label: "Mi. 10.06.",
    minTemperature: 12,
    maxTemperature: 19,
    sunHours: 1,
    precipitationProbability: 90,
  }, "Rasen maehen");
  const dry = rateWeatherDayForTask({
    date: "2026-06-11",
    label: "Do. 11.06.",
    minTemperature: 13,
    maxTemperature: 22,
    sunHours: 8,
    precipitationProbability: 10,
  }, "Rasen maehen");

  assert.ok(dry.score > wet.score);
  assert.equal(wet.rainRisk, "hoch");
});
