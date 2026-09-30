import assert from "node:assert/strict";
import test from "node:test";
import { redditPeriodInput } from "./reddit-testing-period.ts";
import { redditTestGroup, redditTestFormat, redditContentTests } from "./reddit-content-testing.ts";

test("conversion targets the combined prospecting group, excluding the paused and retargeting groups", () => {
  const campaign = "EM-Reddit-Conversion-July26";
  assert.equal(redditTestGroup(campaign, "Prospecting_WaterFilter + HydroHomies"), true);
  assert.equal(redditTestGroup(campaign, "HydroHomies"), false);
  assert.equal(redditTestGroup(campaign, "Prospecting_WaterFilter"), false);
  assert.equal(redditTestGroup(campaign, "Retargetging_WaterFilter + HydroHomies"), false);
});

test("all six requested conversion creatives match in their expected formats", () => {
  const conversion = redditContentTests[0];
  assert.equal(conversion.ads.Video.length, 2);
  assert.equal(conversion.ads.Image.length, 4);
  for (const name of conversion.ads.Video) assert.equal(redditTestFormat(conversion.name, name), "Video");
  for (const name of conversion.ads.Image) assert.equal(redditTestFormat(conversion.name, name), "Image");
  assert.equal(redditTestGroup(redditContentTests[1].name, "HydroHomies"), true);
});

test("Reddit defaults to the moving test period and preserves explicit periods", () => {
  assert.equal(redditPeriodInput({}).preset, "sinceSep24");
  assert.equal(redditPeriodInput({period:"sinceSep24"}).preset, "sinceSep24");
  assert.equal(redditPeriodInput({period:"lastWeek"}).preset, "lastWeek");
  assert.equal(redditPeriodInput({period:"last30"}).preset, "last30");
  assert.deepEqual(redditPeriodInput({period:["custom"],start:"2026-09-25",end:"2026-09-28"}), {preset:"custom",start:"2026-09-25",end:"2026-09-28"});
  assert.equal(redditPeriodInput({period:"unknown"}).preset, "sinceSep24");
});
