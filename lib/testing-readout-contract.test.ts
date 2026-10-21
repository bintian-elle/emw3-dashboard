import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeTestingReadouts, testingReadoutKey } from "./testing-readout-contract.ts";
const period = { label: "Last Week (Tue–Mon)", start: "2026-10-13", end: "2026-10-19" };
const key = testingReadoutKey(period)!;
const readout = { schema_version: "1.0", run_mode: "period_readout", period, tests: [{ test_id: "live-test", summary: "Observed results.", delta: { metrics: [{ name: "ROAS", test_value: 1.5, comparison_value: 1, absolute_delta: 0.5, relative_delta_pct: 50 }] } }] };
const envelope = (value: unknown) => ({ schema_version: "1.0", run_mode: "period_readout_batch", period_readouts: [value] });
const identities = { [key]: ["live-test"] };
test("dedicated testing schema decodes exact reporting dates and identities", () => {
  const decoded = decodeTestingReadouts(envelope(readout), [period], identities);
  assert.equal(decoded.records.size, 1); assert.deepEqual(decoded.errors, []);
});
test("different reporting dates and invented campaign identities cannot enter the cache", () => {
  assert.equal(decodeTestingReadouts(envelope({ ...readout, period: { ...period, end: "2026-10-18" } }), [period], identities).records.size, 0);
  assert.equal(decodeTestingReadouts(envelope(readout), [period], { [key]: ["other-test"] }).records.size, 0);
});
test("one invalid period does not discard another completed period", () => {
  const decoded = decodeTestingReadouts({ schema_version: "1.0", run_mode: "period_readout_batch", period_readouts: ["not JSON", readout] }, [period], identities);
  assert.equal(decoded.records.size, 1); assert.ok(decoded.errors.length);
});
test("rejects impossible percentage change from a zero comparison and incomplete coverage", () => {
  const bad = structuredClone(readout); bad.tests[0].delta.metrics[0].comparison_value = 0;
  assert.equal(decodeTestingReadouts(envelope(bad), [period], identities).records.size, 0);
  assert.equal(decodeTestingReadouts(envelope({ ...readout, tests: [] }), [period], identities).records.size, 0);
});
