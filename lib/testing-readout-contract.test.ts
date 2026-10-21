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

// Social analysis is one reusable lifetime record, independent of the day.
test("Social lifetime cache identity does not change with calendar dates",()=>{
 assert.equal(testingReadoutKey({label:"Lifetime snapshot",start:"2026-10-20",end:"2026-10-20"}),testingReadoutKey({label:"Lifetime snapshot",start:"2026-10-21",end:"2026-10-21"}));
});

test("Reddit lifetime has a single cache identity and keeps ordinary reporting periods separate",()=>{
 const first={label:"Lifetime (Sep 24, 2026 – Now)",start:"2026-09-24",end:"2026-10-20"};
 assert.equal(testingReadoutKey(first),"period:reddit-lifetime");
 assert.equal(testingReadoutKey({...first,end:"2026-10-21"}),testingReadoutKey(first));
 assert.notEqual(testingReadoutKey(period),testingReadoutKey(first));
 const result={...readout,period:first,tests:[{test_id:"reddit-test",channel:"Reddit",summary:"Lifetime findings",recommended_action:"Continue the matched test",asset_insights:["[RD-TEST] Ad evidence"]}]};
 const decoded=decodeTestingReadouts(envelope(result),[first],{"period:reddit-lifetime":["reddit-test"]},{Reddit:["RD-TEST"]});
 assert.equal(decoded.records.size,1);assert.deepEqual(decoded.errors,[]);
});

test("concluded lifetime keys isolate individual tests and restore trusted identity metadata", () => {
 const period={label:"Lifetime snapshot",start:"2026-07-31",end:"2026-09-23",concludedTestId:"brand-experiment"};
 const key=testingReadoutKey(period)!;
 assert.equal(key,"period:concluded:brand-experiment");
 assert.notEqual(key,testingReadoutKey({...period,concludedTestId:"other-experiment"}));
 assert.notEqual(key,testingReadoutKey({label:period.label,start:period.start,end:period.end}));
 const nativePeriod={label:period.label,start:period.start,end:period.end};
 const decoded=decodeTestingReadouts(envelope({...readout,period:nativePeriod}),[period],{[key]:["live-test"]});
 assert.deepEqual(decoded.errors,[]);
 assert.equal(decoded.records.get(key)?.period.concludedTestId,"brand-experiment");
 assert.equal(decodeTestingReadouts(envelope({...readout,period:{...nativePeriod,end:"2026-09-24"}}),[period],{[key]:["live-test"]}).records.size,0);
 assert.throws(()=>testingReadoutKey({...period,concludedTestId:"../unsafe"}));
});
