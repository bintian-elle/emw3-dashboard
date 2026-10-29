import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveTranslationChunk} from './testing-readout-translation-retry.ts';
const result=(text:string)=>({status:'completed',result:{answer_markdown:`<translation-json>${JSON.stringify({s0:text})}</translation-json>`}});
test('reuse a valid saved translation without inference',async()=>{
 const value=await resolveTranslationChunk('chunk',['Spend $12'],true,async()=>result('花费 $12'),async()=>{throw Error('must not enqueue');});
 assert.equal(value?.get('Spend $12'),'花费 $12');
});
test('retry only an invalid chunk and reuse the saved valid retry',async()=>{
 const ids:string[]=[];
 const read=async(id:string)=>id==='chunk'?result('花费 $13'):null;
 assert.equal(await resolveTranslationChunk('chunk',['Spend $12'],true,read,async(id:string)=>{ids.push(id);return {status:'queued'};}),null);
 assert.deepEqual(ids,['chunk:retry:1']);
 const translated=await resolveTranslationChunk('chunk',['Spend $12'],true,async(id:string)=>id==='chunk'?result('花费 $13'):result('花费 $12'),async()=>{throw Error('duplicate');});
 assert.equal(translated?.get('Spend $12'),'花费 $12');
});
test('read-only never queues a retry and exhaustion is bounded',async()=>{
 assert.equal(await resolveTranslationChunk('chunk',['Spend $12'],false,async()=>result('花费 $13'),async()=>{throw Error('read only');}),null);
 let reads=0;
 await assert.rejects(resolveTranslationChunk('chunk',['Spend $12'],true,async()=>{reads++;return result('花费 $13');},async()=>{throw Error('no extra enqueue');}),/3 attempts/);
 assert.equal(reads,3);
});
