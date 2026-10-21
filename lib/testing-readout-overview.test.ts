import { test } from "node:test";
import assert from "node:assert/strict";
import { overviewExecutiveSummary } from "./testing-readout-overview.ts";

test("surface the existing AI reach finding without creating new analysis", () => {
  const summary = "Spend is $100 and ROAS is 2.00. Continue validation.";
  const finding = "[OV-OVERALL] Available additive reach is 1,234; audiences overlap.";
  assert.equal(overviewExecutiveSummary(summary, [finding]), `${summary} Available additive reach is 1,234; audiences overlap.`);
});
test("do not duplicate reach or invent a missing reach value", () => {
  assert.equal(overviewExecutiveSummary("Spend $100; reach 1,234.", ["[OV-OVERALL] Reach 1,234."]), "Spend $100; reach 1,234.");
  assert.equal(overviewExecutiveSummary("No reach is available.", []), "No reach is available.");
  assert.equal(overviewExecutiveSummary("Spend $100.", ["[OV-CHANNELS] A channel leads."]), "Spend $100.");
  assert.equal(overviewExecutiveSummary(null, ["[OV-OVERALL] Reach 1,234."]), null);
});
