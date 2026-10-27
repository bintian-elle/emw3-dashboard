import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readTrackingPageCache,refreshTrackingPageCache,trackingPageCachePaths} from './website-tracking-page-cache.ts';
import {trackingPageScope,type TrackingPageData} from './website-tracking-pages.ts';
const period={start:'2026-09-26',end:'2026-10-25'},now=Date.now();
const scope=trackingPageScope();
function data(selected=scope):TrackingPageData{const report=()=>({rows:[],warnings:[]});return {property:'451107071',fetchedAt:new Date(now).toISOString(),scope:selected,events:report(),features:report(),daily:report(),paths:report()};}
async function directory(work:(directory:string)=>Promise<void>){const path=await mkdtemp(join(tmpdir(),'tracking-pages-'));try{await work(path);}finally{await rm(path,{recursive:true,force:true});}}
test('page, exact URL, device and dates have independent persistent snapshots',()=>directory(async dir=>{
 await refreshTrackingPageCache(period,'all',scope,async()=>data(),{directory:dir,now});
 assert.ok((await readTrackingPageCache(period,'all',scope,{directory:dir,now})).data);
 for(const next of [trackingPageScope('pdp'),trackingPageScope('collection','/collections/shop-all')])assert.equal((await readTrackingPageCache(period,'all',next,{directory:dir,now})).data,undefined);
 assert.equal((await readTrackingPageCache(period,'mobile',scope,{directory:dir,now})).data,undefined);
 assert.equal((await readTrackingPageCache({...period,start:'2026-09-27'},'all',scope,{directory:dir,now})).data,undefined);
}));
test('failed or partial page refresh keeps the previous complete page and backs off',()=>directory(async dir=>{
 await refreshTrackingPageCache(period,'all',scope,async()=>data(),{directory:dir,now});
 const later=now+3600001,bad=data();bad.daily.warnings=['Partial GA4 report.'];
 assert.equal(await refreshTrackingPageCache(period,'all',scope,async()=>bad,{directory:dir,now:later}),false);
 const saved=await readTrackingPageCache(period,'all',scope,{directory:dir,now:later});assert.equal(saved.data?.fetchedAt,data().fetchedAt);assert.ok(saved.error);assert.equal(saved.needsRefresh,false);
}));
test('mismatched scope and malformed cache files are rejected without exposing wrong page data',()=>directory(async dir=>{
 assert.equal(await refreshTrackingPageCache(period,'all',scope,async()=>data(trackingPageScope('pdp')),{directory:dir,now}),false);
 const paths=trackingPageCachePaths(period,'all',scope,dir);await writeFile(paths.snapshot,JSON.stringify({version:1,period,device:'all',scope,data:{property:'451107071',scope,events:{rows:[null]}}}));
 assert.equal((await readTrackingPageCache(period,'all',scope,{directory:dir,now})).data,undefined);
}));
