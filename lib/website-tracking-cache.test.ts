import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readTrackingCache,refreshTrackingCache,trackingCachePaths,CACHE_TTL_MS} from './website-tracking-cache.ts';
import type {TrackingData} from './website-tracking.ts';
const period={start:'2026-10-18',end:'2026-10-24'};
const now=Date.parse('2026-10-26T12:00:00Z');
function data(time=now):TrackingData{const report=()=>({rows:[],warnings:[]});return {overview:{rows:[{dimensions:[],metrics:[7,10,2,0]}],warnings:[]},devices:report(),events:report(),actions:report(),lists:report(),purchases:report(),property:'451107071',fetchedAt:new Date(time).toISOString()};}
async function withDirectory(work:(directory:string)=>Promise<void>){const directory=await mkdtemp(join(tmpdir(),'tracking-cache-'));try{await work(directory);}finally{await rm(directory,{recursive:true,force:true});}}
test('fresh snapshots are persistent and isolated by exact dates and device',()=>withDirectory(async directory=>{
 await refreshTrackingCache(period,'all',async()=>data(),{directory,now});
 const fresh=await readTrackingCache(period,'all',{directory,now});
 assert.equal(fresh.stale,false);assert.equal(fresh.needsRefresh,false);assert.equal(fresh.data?.overview.rows[0].metrics[0],7);
 assert.equal((await readTrackingCache(period,'mobile',{directory,now})).data,undefined);
 assert.equal((await readTrackingCache({...period,end:'2026-10-25'},'all',{directory,now})).data,undefined);
}));
test('expired data remains readable while one background refresh owns the scope lock',()=>withDirectory(async directory=>{
 await refreshTrackingCache(period,'all',async()=>data(),{directory,now});
 const later=now+CACHE_TTL_MS+1;
 const stale=await readTrackingCache(period,'all',{directory,now:later});assert.equal(stale.stale,true);assert.equal(stale.needsRefresh,true);
 let finish!:(value:TrackingData)=>void;let started!:()=>void;const ready=new Promise<void>(resolve=>started=resolve);let calls=0;
 const pending=refreshTrackingCache(period,'all',()=>{calls++;started();return new Promise(resolve=>finish=resolve);},{directory,now:later});
 await ready;
 assert.equal(await refreshTrackingCache(period,'all',async()=>{calls++;return data(later);},{directory,now:later}),false);
 const reading=await readTrackingCache(period,'all',{directory,now:later});assert.equal(reading.refreshing,true);assert.equal(reading.data?.fetchedAt,data().fetchedAt);assert.equal(calls,1);
 finish(data(later));await pending;
 assert.equal((await readTrackingCache(period,'all',{directory,now:later})).stale,false);
}));
test('failed refresh retains the last successful snapshot and backs off',()=>withDirectory(async directory=>{
 await refreshTrackingCache(period,'all',async()=>data(),{directory,now});const later=now+CACHE_TTL_MS+1;
 assert.equal(await refreshTrackingCache(period,'all',async()=>{throw Error('offline');},{directory,now:later}),false);
 const state=await readTrackingCache(period,'all',{directory,now:later});assert.equal(state.data?.fetchedAt,data().fetchedAt);assert.ok(state.error);assert.equal(state.needsRefresh,false);assert.equal(state.refreshing,false);
 assert.equal((await readTrackingCache(period,'all',{directory,now:later+6*60000})).needsRefresh,true);
}));
test('error and partial reports cannot replace a good snapshot',()=>withDirectory(async directory=>{
 await refreshTrackingCache(period,'all',async()=>data(),{directory,now});const bad=data(now+CACHE_TTL_MS+1);bad.actions.error='unavailable';
 assert.equal(await refreshTrackingCache(period,'all',async()=>bad,{directory,now:now+CACHE_TTL_MS+1}),false);
 assert.equal((await readTrackingCache(period,'all',{directory,now:now+CACHE_TTL_MS+1})).data?.fetchedAt,data().fetchedAt);
 const partial=data(now+2*CACHE_TTL_MS);partial.lists.warnings=['Partial GA4 report. Narrow the date range before comparing totals.'];
 assert.equal(await refreshTrackingCache(period,'all',async()=>partial,{directory,now:now+2*CACHE_TTL_MS}),false);
}));
test('a corrupt snapshot is treated as a cache miss and can recover',()=>withDirectory(async directory=>{
 const files=trackingCachePaths(period,'all',directory);await writeFile(files.snapshot,'invalid');
 assert.equal((await readTrackingCache(period,'all',{directory,now})).data,undefined);
 await refreshTrackingCache(period,'all',async()=>data(),{directory,now});assert.ok((await readTrackingCache(period,'all',{directory,now})).data);
}));
test('an abandoned lock file cannot admit concurrent recovery workers',()=>withDirectory(async directory=>{
 const files=trackingCachePaths(period,'all',directory);
 await writeFile(files.lock,'abandoned lock');
 await writeFile(files.owner,JSON.stringify({pid:2147483647,token:'old',startedAt:0}));
 let finish!:(value:TrackingData)=>void;let started!:()=>void;const ready=new Promise<void>(resolve=>started=resolve);let calls=0;
 const first=refreshTrackingCache(period,'all',()=>{calls++;started();return new Promise(resolve=>finish=resolve);},{directory,now});
 await ready;
 const others=await Promise.all(Array.from({length:4},()=>refreshTrackingCache(period,'all',async()=>{calls++;return data();},{directory,now})));
 assert.deepEqual(others,[false,false,false,false]);assert.equal(calls,1);
 finish(data());assert.equal(await first,true);
 assert.equal((await readTrackingCache(period,'all',{directory,now})).refreshing,false);
}));
test('kernel lease is released when a worker crashes',()=>withDirectory(async directory=>{
 const {spawn}=await import('node:child_process');const {acquireTrackingLease}=await import('./website-tracking-lease.ts');
 const file=trackingCachePaths(period,'all',directory).lock;
 const moduleUrl=new URL('./website-tracking-lease.ts',import.meta.url).href;
 const child=spawn(process.execPath,['--experimental-strip-types','--input-type=module','-e',`import {acquireTrackingLease} from ${JSON.stringify(moduleUrl)};await acquireTrackingLease(${JSON.stringify(file)});console.log('OWNER_READY');setInterval(()=>{},1000);`],{stdio:['ignore','pipe','ignore']});
 try{
  await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Owner did not start')),5000);child.stdout.on('data',chunk=>{if(String(chunk).includes('OWNER_READY')){clearTimeout(timer);resolve();}});child.on('error',reject);});
  assert.equal(await acquireTrackingLease(file),null);
  const stopped=new Promise<void>(resolve=>child.once('close',()=>resolve()));child.kill('SIGKILL');await stopped;
  let next:Awaited<ReturnType<typeof acquireTrackingLease>>=null;
  for(let attempt=0;attempt<20&&!next;attempt++){next=await acquireTrackingLease(file);if(!next)await new Promise(resolve=>setTimeout(resolve,10));}
  assert.ok(next);await next.release();
 }finally{child.kill('SIGKILL');}
}));

test('incomplete extended reports cannot overwrite the last successful snapshot',()=>withDirectory(async directory=>{
 await refreshTrackingCache(period,'all',async()=>data(),{directory,now});
 const later=now+CACHE_TTL_MS+1,bad=data(later);
 bad.collection={visitors:{rows:[],warnings:[]},clicks:{rows:[],warnings:[],error:'failed'}};
 assert.equal(await refreshTrackingCache(period,'all',async()=>bad,{directory,now:later}),false);
 assert.equal((await readTrackingCache(period,'all',{directory,now:later})).data?.fetchedAt,data().fetchedAt);
}));
