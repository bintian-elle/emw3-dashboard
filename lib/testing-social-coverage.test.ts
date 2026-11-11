import {test} from 'node:test';
import assert from 'node:assert/strict';
import {repairSocialCoverage,type SocialCoverageQuery} from './testing-social-coverage.ts';
import {instagramPostCodes,socialMetrics} from './instagram-posts.ts';

const metrics=Object.fromEntries(socialMetrics.map(key=>[key,key==='follows'?null:1]));
const full={version:2,capturedAt:'2026-11-11T16:00:00Z',posts:instagramPostCodes.map(code=>({code,status:'partial',metrics,paid:{status:'available',metrics}}))};
const incomplete={...full,posts:full.posts.slice(0,-4)};
function db(current:unknown,attempt?:Record<string,unknown>){
 const writes:Array<{channel:unknown;payload:unknown}>=[];const calls:string[]=[];
 const query:SocialCoverageQuery=async(sql,values)=>{calls.push(sql);
  if(sql.includes('pg_try_advisory_xact_lock'))return {rows:[{locked:true}]};
  if(sql.includes('from testing_data_snapshots')&&values?.[0]==='social')return {rows:current?[{payload:current}]:[]};
  if(sql.includes('from testing_data_snapshots')&&values?.[0]==='social-coverage-attempt')return {rows:attempt?[attempt]:[]};
  if(sql.startsWith('insert')){writes.push({channel:values?.[0],payload:JSON.parse(values?.[2] as string)});return {rows:[]};}
  return {rows:[]};};
 return {query,writes,calls};
}
test('a complete shared snapshot never calls Meta',async()=>{const d=db(full);let calls=0;assert.equal((await repairSocialCoverage(d.query,async()=>{calls++;return full;})).status,'complete');assert.equal(calls,0);assert.deepEqual(d.writes,[]);});
test('a snapshot missing new posts fetches and publishes a complete replacement',async()=>{const d=db(incomplete);let calls=0;assert.equal((await repairSocialCoverage(d.query,async()=>{calls++;return full;})).status,'updated');assert.equal(calls,1);assert.equal(d.writes.filter(x=>x.channel==='social').length,1);assert.equal(d.calls.at(-1),'commit');});
test('API limits preserve the existing snapshot and record a bounded retry',async()=>{const d=db(incomplete);const result=await repairSocialCoverage(d.query,async()=>{throw Error('API rate limit HTTP 429');});assert.deepEqual(result,{status:'failed',limited:true});assert.equal(d.writes.some(x=>x.channel==='social'),false);assert.equal(d.calls.at(-1),'commit');});
test('an incomplete API response is never saved',async()=>{const d=db(incomplete);assert.equal((await repairSocialCoverage(d.query,async()=>incomplete)).status,'failed');assert.equal(d.writes.some(x=>x.channel==='social'),false);});
test('recent failed repair prevents repeated API calls',async()=>{const d=db(incomplete,{recent:true,payload:{signature:instagramPostCodes.join(','),status:'failed',limited:true}});let calls=0;assert.deepEqual(await repairSocialCoverage(d.query,async()=>{calls++;return full;}),{status:'cooldown',limited:true});assert.equal(calls,0);});
test('a new post set invalidates the failure cooldown',async()=>{const d=db(incomplete,{recent:true,payload:{signature:'older-list',status:'failed'}});let calls=0;assert.equal((await repairSocialCoverage(d.query,async()=>{calls++;return full;})).status,'updated');assert.equal(calls,1);});
test('a concurrent refresh owns the lock and prevents another Meta request',async()=>{let calls=0;const query:SocialCoverageQuery=async sql=>({rows:sql.includes('pg_try_advisory_xact_lock')?[{locked:false}]:[]});assert.equal((await repairSocialCoverage(query,async()=>{calls++;return full;})).status,'busy');assert.equal(calls,0);});
test('a database write failure rolls back rather than publish incomplete results',async()=>{const calls:string[]=[];const query:SocialCoverageQuery=async(sql,values)=>{calls.push(sql);if(sql.includes('pg_try_advisory'))return {rows:[{locked:true}]};if(sql.includes('from testing_data_snapshots')&&values?.[0]==='social')return {rows:[{payload:incomplete}]};if(sql.startsWith('insert'))throw Error('database unavailable');return {rows:[]};};await assert.rejects(()=>repairSocialCoverage(query,async()=>full),/database unavailable/);assert.equal(calls.at(-1),'rollback');});
