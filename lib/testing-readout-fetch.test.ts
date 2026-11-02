import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchTestingReadoutJson } from './testing-readout-fetch.ts';

test('stalled readout requests time out and a later request can succeed', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = ((_url: unknown, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })) as typeof fetch;
    await assert.rejects(fetchTestingReadoutJson('/readout', undefined, 10), { name: 'AbortError' });
    globalThis.fetch = (async () => new Response(JSON.stringify({ records: ['ready'] }))) as typeof fetch;
    assert.deepEqual(await fetchTestingReadoutJson('/readout'), { records: ['ready'] });
  } finally { globalThis.fetch = original; }
});

test('failed responses do not replace a successful readout', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response('', { status: 503 })) as typeof fetch;
    await assert.rejects(fetchTestingReadoutJson('/readout'), /Readout request failed/);
  } finally { globalThis.fetch = original; }
});

test('both languages persist locally and repeated reads make no network requests',async()=>{
 const {createInsightCache}=await import('./testing-insight-browser-cache.ts');
 const stored=new Map<string,string>();let calls=0;
 const storage={getItem:(key:string)=>stored.get(key)??null,setItem:(key:string,value:string)=>{stored.set(key,value);}};
 const load=async(url:string)=>{calls++;return {records:[{payload:{summary:url.includes('language=zh')?'中文':'English'}}]};};
 const cache=createInsightCache(storage,load,()=>Date.parse('2026-11-02T14:00:00Z'));
 await cache.read('/api/testing/readouts?key=period:test&language=en','account-a');
 await cache.read('/api/testing/readouts?language=zh&key=period:test','account-a');
 assert.equal(calls,2);
 const restored=createInsightCache(storage,load,()=>Date.parse('2026-11-02T14:00:00Z'));
 await restored.read('/api/testing/readouts?language=en&key=period:test','account-a');
 assert.equal(calls,2);
 await restored.read('/api/testing/readouts?language=en&key=period:test','account-b');
 assert.equal(calls,4);
});

test('daily background refresh serves saved content immediately and retains it on failure',async()=>{
 const {createInsightCache}=await import('./testing-insight-browser-cache.ts');
 let time=Date.parse('2026-11-02T14:00:00Z'),fail=false,calls=0;
 const stored=new Map<string,string>();
 const cache=createInsightCache({getItem:k=>stored.get(k)??null,setItem:(k,v)=>{stored.set(k,v);}},async()=>{calls++;if(fail)throw Error('offline');return {records:[{payload:{summary:'Saved analysis'}}]};},()=>time);
 const initial=await cache.read('/api/testing/readouts?key=period:test&language=en','a');
 fail=true;time+=86400000;
 assert.deepEqual(await cache.read('/api/testing/readouts?key=period:test&language=en','a'),initial);
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.ok(calls>=3);
 assert.deepEqual(await cache.read('/api/testing/readouts?key=period:test&language=zh','a'),initial);
});

test('pending translations never overwrite a completed local language result',async()=>{
 const {createInsightCache}=await import('./testing-insight-browser-cache.ts');
 const stored=new Map<string,string>();let time=Date.parse('2026-11-02T14:00:00Z'),pending=false;
 const cache=createInsightCache({getItem:k=>stored.get(k)??null,setItem:(k,v)=>{stored.set(k,v);}},async()=>({records:[{payload:pending?{_translation_pending:true}:{summary:'Complete'}}]}),()=>time);
 await cache.read('/api/testing/readouts?key=period:test&language=zh','a');
 pending=true;time+=86400000;
 await cache.read('/api/testing/readouts?key=period:test&language=zh','a');
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(await cache.read('/api/testing/readouts?key=period:test&language=zh','a'),{records:[{payload:{summary:'Complete'}}]});
});

test('confirmed empty periods are remembered locally and invalidated after generation',async()=>{
 const {createInsightCache}=await import('./testing-insight-browser-cache.ts');
 const data=new Map<string,string>();let calls=0,available=false;
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};
 const load=async()=>{calls++;return {records:available?[{payload:{summary:'Ready'}}]:[]};};
 const url='/api/testing/readouts?key=period:custom:2026-10-01:2026-10-05&language=en';
 const first=createInsightCache(storage,load,()=>Date.parse('2026-11-02T14:00:00Z'));
 await first.read(url,'owner');await new Promise(resolve=>setTimeout(resolve,0));
 const restored=createInsightCache(storage,load,()=>Date.parse('2026-11-02T14:00:00Z'));
 const previous=calls;assert.deepEqual(await restored.read(url,'owner'),{records:[]});assert.equal(calls,previous);
 available=true;restored.invalidateMissing('owner');
 assert.deepEqual(await restored.read(url,'owner'),{records:[{payload:{summary:'Ready'}}]});
});

test('publishing a manual report invalidates a mixed saved-and-missing period response',async()=>{
 const {createInsightCache}=await import('./testing-insight-browser-cache.ts');
 const data=new Map<string,string>();let ready=false;
 const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},key:(i:number)=>[...data.keys()][i]??null,get length(){return data.size;}};
 const manual='period:manual-meta-last-7-days:2026-10-26:2026-11-01';
 const url=`/api/testing/readouts?key=${encodeURIComponent(manual)}&key=period%3Alast-7-days%3A2026-10-26%3A2026-11-01&language=en`;
 const cache=createInsightCache(storage,async()=>({records:ready?[{cache_key:manual}]:[{cache_key:'period:old'}]}));
 await cache.read(url,'a');await new Promise(resolve=>setTimeout(resolve,0));
 ready=true;cache.invalidatePeriod('a',manual);
 assert.deepEqual(await cache.read(url,'a'),{records:[{cache_key:manual}]});
});
