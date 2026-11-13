import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {sanitizeTrackingQuota,formatTrackingQuota} from './website-tracking-quota.mjs';
import {ga4EnvelopeError} from './website-tracking-transport.ts';
import {trackingReportReader} from './website-tracking-reader.ts';
import {refreshTrackingCache,readTrackingCache,trackingCachePaths} from './website-tracking-cache.ts';
import {trackingFailureDetails} from '../scripts/website-tracking-notices.mjs';
const quota={categories:['serverErrorsPerProjectPerHour','SECRET'],limits:[{category:'serverErrorsPerProjectPerHour',limit:10},{category:'SECRET',limit:123}],retryAfterSeconds:120,retryAt:'2026-11-13T16:02:00+00:00',retrySource:'retry-after',message:'SECRET Bearer private',consumer:'projects/SECRET'};
test('quota formatting includes only allowed quota, limits and official retry timing',()=>{
 const text=formatTrackingQuota(quota);assert.match(text,/服务器错误/);assert.match(text,/=10/);assert.match(text,/120 秒/);assert.match(text,/美东时间/);assert.doesNotMatch(text,/SECRET|Bearer|projects/);
 assert.match(formatTrackingQuota(undefined),/Google 未明确返回.*Google 未提供重试时间/);
 assert.equal(sanitizeTrackingQuota({retryAfterSeconds:Infinity,retrySource:'SECRET'})?.retryProvided,false);
});
test('quota evidence survives CLI error -> reader -> retained cache -> Slack alert',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'tracking-quota-'));const now=Date.now(),period={start:'2026-11-01',end:'2026-11-07'};
 const empty=()=>({rows:[],warnings:[]});const data=()=>({overview:empty(),devices:empty(),events:empty(),actions:empty(),lists:empty(),purchases:empty(),property:'451107071',fetchedAt:new Date(now).toISOString()});
 try{
  await refreshTrackingCache(period,'all',async()=>data(),{directory,now});const files=trackingCachePaths(period,'all',directory),original=await readFile(files.snapshot,'utf8');
  const reader=await trackingReportReader(period,'all',{query:async()=>{throw ga4EnvelopeError({status:'throttled',http_status:429,quota});},readExport:async()=>''});
  const failedReport=await reader.report([],['totalUsers']);
  assert.equal(await refreshTrackingCache(period,'all',async()=>({...data(),overview:failedReport}),{directory,now:now+1,force:true}),false);
  assert.equal(await readFile(files.snapshot,'utf8'),original);
  const state=await readTrackingCache(period,'all',{directory,now:now+1});assert.deepEqual(state.failure?.quota?.categories,['serverErrorsPerProjectPerHour']);
  const saved=await readFile(files.failure,'utf8');assert.doesNotMatch(saved,/SECRET|Bearer|projects/);
  const alert=trackingFailureDetails({failed:1,updatedAt:new Date().toISOString(),failures:[{device:'all',scope:'overview',...state.failure}]},0);
  assert.match(alert,/HTTP 429/);assert.match(alert,/服务器错误/);assert.match(alert,/Retry-After/);assert.doesNotMatch(alert,/SECRET/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
