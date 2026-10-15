import {test} from "node:test";
import assert from "node:assert/strict";
import {googleReachValues} from "./google-reach-metrics.ts";
test("period-level Google unique_users are preserved, including empty metric objects",()=>{
 assert.deepEqual(googleReachValues(['Purchase','TIS','No activity','No row'],[{campaign:{name:'Purchase'},metrics:{uniqueUsers:'4644'}},{campaign:{name:'TIS'},metrics:{uniqueUsers:260}},{campaign:{name:'No activity'}}]),{Purchase:4644,TIS:260,'No activity':null,'No row':null});
});
test("valid zero reach is distinct from unavailable",()=>assert.deepEqual(googleReachValues(['Zero','Missing'],[{campaign:{name:'Zero'},metrics:{uniqueUsers:0}},{campaign:{name:'Missing'},metrics:{}}]),{Zero:0,Missing:null}));
