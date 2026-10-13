import {test} from "node:test";
import assert from "node:assert/strict";
import {resolveTestingPeriod} from "./testing-period.ts";
test("Tuesday week-to-date is today, never Tuesday through Monday",()=>assert.deepEqual(resolveTestingPeriod("2026-10-12",{preset:"wtd"}),{start:"2026-10-13",end:"2026-10-13"}));
test("midweek includes completed days from Tuesday",()=>assert.deepEqual(resolveTestingPeriod("2026-10-14",{preset:"wtd"}),{start:"2026-10-13",end:"2026-10-14"}));
test("all presets produce ordered ranges across week and month boundaries",()=>{for(const latest of ["2026-10-12","2026-10-13","2026-09-30","2026-12-31"]){for(const preset of ["wtd","lastWeek","last7","last30","last90","mtd","ytd"] as const){const period=resolveTestingPeriod(latest,{preset});assert.ok(period.start<=period.end);}}});
