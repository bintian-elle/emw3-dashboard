import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {readLatestWithFallback} from './testing-snapshot-fallback.ts';

const snapshot=(value:string,date:string)=>({value,updatedAt:date});
const old=snapshot('old','2026-10-27T10:00:00.000Z');
const current=snapshot('current','2026-10-28T10:00:00.000Z');
const newer=snapshot('newer','2026-10-29T10:00:00.000Z');
const failure=async()=>{throw new Error('database unavailable');};

test('returns latest successful data during failure and uses existing channel memory if needed',async()=>{
 const latest=new Map<string,typeof old|null>();
 assert.deepEqual(await readLatestWithFallback('meta',latest,()=>[old],failure),old);
 assert.deepEqual(await readLatestWithFallback('meta',latest,()=>[old],async()=>current),current);
 assert.deepEqual(await readLatestWithFallback('meta',latest,()=>[old],failure),current);
 assert.deepEqual(await readLatestWithFallback('meta',latest,()=>[newer],failure),newer);
 assert.equal(await readLatestWithFallback('reddit',latest,()=>[],failure),null);
});

test('successful database results are authoritative, including an empty result',async()=>{
 const latest=new Map<string,typeof old|null>();
 await readLatestWithFallback('meta',latest,()=>[],async()=>newer);
 assert.deepEqual(await readLatestWithFallback('meta',latest,()=>[newer],async()=>current),current);
 assert.equal(await readLatestWithFallback('meta',latest,()=>[newer],async()=>null),null);
 assert.equal(await readLatestWithFallback('meta',latest,()=>[newer],failure),null);
 assert.deepEqual(await readLatestWithFallback('meta',latest,()=>[old],async()=>current),current);
});
