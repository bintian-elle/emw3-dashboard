import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp, readFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {collectSnapshots, finalizationDate} from "./concluded-test-snapshots.mjs";

const definitions=[{id:"test",experimentId:"experiment",campaignName:"Brand"}];
const experiment={start_date:"2026-09-01",end_date:"2026-09-02",status:"HALTED"};
const rows=["TREATMENT","CONTROL"].map(arm_type=>({arm_type,experiment_arm_id:arm_type,campaign_name:arm_type,cost_micros:"10000000",conversions_value:"20",conversions:"2",impressions:"100",clicks:"10",days:2,oldest_update:"2026-09-12T00:00:00Z",latest_update:"2026-09-12T00:00:00Z"}));
test("end plus ten days handles month boundaries",()=>assert.equal(finalizationDate("2026-09-23"),"2026-10-03T00:00:00.000Z"));
test("waits for attribution, freezes lifetime results, then never queries again",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"concluded-"));let calls=0;
 const query=async()=>({rows:++calls%2===1?[experiment]:rows});
 try {
  await collectSnapshots({query,definitions,directory,now:new Date("2026-09-11T23:59:59Z")}); assert.equal(calls,1);
  calls=0;await collectSnapshots({query,definitions,directory,now:new Date("2026-09-12T00:00:00Z")});assert.equal(calls,2);
  const saved=JSON.parse(await readFile(path.join(directory,"test.json")));assert.deepEqual(saved.report.period,{start:"2026-09-01",end:"2026-09-02"});assert.equal(saved.report.groups[0].roas,2);
  await collectSnapshots({query:()=>{throw Error("must not query")},definitions,directory});
 } finally {await rm(directory,{recursive:true,force:true});}
});
test("partial control/treatment data cannot be frozen",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"concluded-"));let calls=0;
 try {await assert.rejects(collectSnapshots({query:async()=>({rows:++calls===1?[experiment]:[rows[0]]}),definitions,directory,now:new Date("2026-09-12")}),/Incomplete/);}
 finally {await rm(directory,{recursive:true,force:true});}
});

test("stale attribution is provisional and can be finalized after backfill",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"concluded-"));let calls=0;
 try {
  await collectSnapshots({query:async()=>({rows:++calls%2===1?[experiment]:rows.map(row=>({...row,oldest_update:"2026-09-10T00:00:00Z"}))}),definitions,directory,now:new Date("2026-09-12")});
  assert.equal(JSON.parse(await readFile(path.join(directory,"test.json"))).finalized,false);
  calls=0;await collectSnapshots({query:async()=>({rows:++calls%2===1?[experiment]:rows}),definitions,directory,now:new Date("2026-09-13")});
  assert.equal(JSON.parse(await readFile(path.join(directory,"test.json"))).finalized,true);
 } finally {await rm(directory,{recursive:true,force:true});}
});
