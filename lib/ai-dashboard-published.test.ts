import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,stat,mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {generateProjectOverview,publishOverview,readPublishedOverview,servedProjectOverview,validatePublishedOverview,publishedOverviewFile,sourcePeriodClosesAt,resolvePublishedRequestedRange} from './ai-dashboard-published.ts';
import type {DashboardReport} from './ai-dashboard.ts';
const oldRange={start:'2026-10-13',end:'2026-10-19'},newRange={start:'2026-10-20',end:'2026-10-26'};
function report(range=oldRange,value=100):DashboardReport{return{title:'RingConn overview',summary:'Native GA4 sessions',range,snapshotId:'ringconn-cache',generatedAt:'2026-10-26T12:00:00Z',warnings:[],widgets:[{id:'sessions',title:'Sessions',kind:'metric',source:'ga4',groupBy:'overview',metrics:['sessions'],...{range,currency:'USD',timezone:'America/Los_Angeles',warnings:[],rows:[{label:'GA4',sessions:value}]}}]};}
async function isolated(work:()=>Promise<void>){const directory=await mkdtemp(path.join(os.tmpdir(),'builder-published-')),before=process.env.AI_DASHBOARD_PROJECTS_DIR;process.env.AI_DASHBOARD_PROJECTS_DIR=directory;try{await work();}finally{if(before===undefined)delete process.env.AI_DASHBOARD_PROJECTS_DIR;else process.env.AI_DASHBOARD_PROJECTS_DIR=before;await rm(directory,{recursive:true,force:true});}}
test('catalog serves the prior frozen report after the target advances and generation fails',()=>isolated(async()=>{
 await publishOverview('ringconn',report(),['ga4']);const advanced=await servedProjectOverview('ringconn',newRange);assert.equal(advanced.pendingPeriod,true);assert.deepEqual(advanced.publication?.range,oldRange);
 const failed=await generateProjectOverview('ringconn',{range:newRange,now:new Date('2026-10-27T15:00:00Z')},{prepare:async()=>{throw Error('Adapter unavailable');}});assert.equal(failed.status,'failed');assert.deepEqual((await readPublishedOverview('ringconn'))?.range,oldRange);assert.equal((await readPublishedOverview('ringconn'))?.report.widgets[0].rows[0].sessions,100);
}));
test('publication switches atomically only when generation succeeds and skips the same week thereafter',()=>isolated(async()=>{
 await publishOverview('ringconn',report(),['ga4']);let release!:()=>void,started!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;}),ready=new Promise<void>(resolve=>{started=resolve;});let reads=0;
 const generation=generateProjectOverview('ringconn',{range:newRange,now:new Date('2026-10-27T15:00:00Z')},{prepare:async()=>{reads++;started();await held;},readiness:async()=>({available:true,sources:['ga4']}),verify:async()=>{},build:async()=>report(newRange,200)});await ready;assert.deepEqual((await readPublishedOverview('ringconn'))?.range,oldRange);const overlap=await generateProjectOverview('ringconn',{range:newRange});assert.equal(overlap.status,'busy');release();assert.equal((await generation).status,'ready');const latest=await readPublishedOverview('ringconn');assert.deepEqual(latest?.range,newRange);assert.equal(latest?.report.widgets[0].rows[0].sessions,200);assert.equal((await stat(publishedOverviewFile('ringconn'))).mode&0o777,0o600);
 const duplicate=await generateProjectOverview('ringconn',{range:newRange},{prepare:async()=>{reads++;}});assert.equal(duplicate.status,'already_ready');assert.equal(reads,1);
}));
test('invalid project identity, foreign snapshots and incomplete generated cards never replace publication',()=>isolated(async()=>{
 const previous=await publishOverview('ringconn',report(),['ga4']);assert.throws(()=>validatePublishedOverview({...previous,project:'biceek'},'ringconn'),/identity/);await assert.rejects(()=>publishOverview('ringconn',{...report(newRange),snapshotId:'biceek-cache'},['ga4']),/another project/);await assert.rejects(()=>publishOverview('unknown' as never,report(),['ga4']),/Unknown project/);
 const bad=report(newRange);bad.widgets[0].rows[0].sessions=null;const result=await generateProjectOverview('ringconn',{range:newRange,now:new Date('2026-10-27T15:00:00Z')},{prepare:async()=>{},readiness:async()=>({available:true,sources:['ga4']}),verify:async()=>{},build:async()=>bad});assert.equal(result.status,'failed');assert.deepEqual((await readPublishedOverview('ringconn'))?.range,oldRange);
}));
test('account-local closure is enforced before refresh and old publication stays available',()=>isolated(async()=>{
 assert.equal(sourcePeriodClosesAt('2026-10-26','America/Los_Angeles'),'2026-10-27T07:00:00.000Z');assert.equal(sourcePeriodClosesAt('2026-10-26','Etc/GMT+8'),'2026-10-27T08:00:00.000Z');assert.equal(sourcePeriodClosesAt('2026-10-26','Etc/GMT+12'),'2026-10-27T12:00:00.000Z');
 await publishOverview('ringconn',report(),['ga4']);let called=false;const pending=await generateProjectOverview('ringconn',{range:newRange,now:new Date('2026-10-27T05:00:00Z')},{prepare:async()=>{called=true;}});assert.equal(pending.status,'pending');assert.equal(called,false);assert.ok(pending.nextEligibleAt);assert.deepEqual((await readPublishedOverview('ringconn'))?.range,oldRange);
}));

test('seven dated rows fetched on unfinished Monday cannot be promoted as a complete week',()=>isolated(async()=>{
 await publishOverview('ringconn',report(),['ga4']);const directory=path.join(process.env.AI_DASHBOARD_PROJECTS_DIR!,'ringconn','overview');await mkdir(directory,{recursive:true});await writeFile(path.join(directory,`ga4-${newRange.start}-${newRange.end}.json`),JSON.stringify({project:'ringconn',source:'ga4',accountRef:'ga4.ringconn',identityVerified:true,...newRange,status:'ready',complete:true,periodClosed:true,fetchedAt:'2026-10-26T20:00:00Z',currency:'USD',timezone:'America/Los_Angeles',origin:'test',totals:{sessions:200,conversions:2,revenue:20},rows:Array.from({length:7},(_,i)=>({date:new Date(Date.parse(newRange.start)+i*86400000).toISOString().slice(0,10),sessions:30,conversions:1,revenue:5}))}));
 const rejected=await generateProjectOverview('ringconn',{range:newRange,cachedOnly:true,now:new Date('2026-10-27T15:00:00Z')});assert.equal(rejected.status,'failed');assert.match(rejected.message||'',/before its period finished/);assert.deepEqual((await readPublishedOverview('ringconn'))?.range,oldRange);
}));

test('natural Last Week follows the published served period while explicit dates still win',()=>isolated(async()=>{
 const served={start:'2026-10-06',end:'2026-10-12'};await publishOverview('ringconn',report(served),['ga4']);assert.deepEqual(await resolvePublishedRequestedRange('Show overview for last week','ringconn'),served);assert.deepEqual(await resolvePublishedRequestedRange('Show last week from 2026-10-13 to 2026-10-19','ringconn'),oldRange);
}));
