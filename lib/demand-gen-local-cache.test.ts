import assert from 'node:assert/strict';
import test from 'node:test';
import {createDemandGenLocalCache,demandGenCacheKey} from './demand-gen-local-cache.ts';

function deferred<T>() {let resolve!:(v:T)=>void;let reject!:(e:Error)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}

test('cold concurrent reads are deduplicated and a warm read returns immediately',async()=>{
 const cache=createDemandGenLocalCache<number>();const pending=deferred<number>();let calls=0;
 const load=()=>{calls++;return pending.promise;};
 const first=cache.get('key',load),second=cache.get('key',load);
 await Promise.resolve();assert.equal(calls,1);pending.resolve(4);
 assert.deepEqual(await Promise.all([first,second]),[4,4]);
 assert.equal(await cache.get('key',load),4);assert.equal(calls,1);
});

test('background refresh replaces only complete results and retains old data on failure',async()=>{
 const cache=createDemandGenLocalCache<number>();let value=1;let fail=false;
 const load=async()=>{if(fail)throw Error('db unavailable');return value;};
 assert.equal(await cache.get('key',load),1);
 value=2;await cache.refreshActive();assert.equal(await cache.get('key',load),2);
 fail=true;await cache.refreshActive();assert.equal(await cache.get('key',load),2);
});

test('a background query in progress does not block a warm page read',async()=>{
 const cache=createDemandGenLocalCache<number>();const pending=deferred<number>();let calls=0;
 const load=()=>++calls===1?Promise.resolve(3):pending.promise;
 assert.equal(await cache.get('key',load),3);
 const updating=cache.refreshActive();assert.equal(await cache.get('key',load),3);assert.equal(calls,2);
 pending.resolve(4);await updating;assert.equal(await cache.get('key',load),4);
});

test('scope keys separate connection, group, campaign and exact reporting range without credentials',()=>{
 const args={campaign:'image',group:'a',preset:'custom',start:'2026-10-01',end:'2026-10-07'};
 const key=demandGenCacheKey('postgres://user:secret@host/db',args,'2026-10-29');
 assert.ok(!key.includes('secret'));
 assert.notEqual(key,demandGenCacheKey('postgres://user:secret@host/db',{...args,group:'b'},'2026-10-29'));
 assert.notEqual(key,demandGenCacheKey('postgres://user:secret@host/db',{...args,start:'2026-10-02'},'2026-10-29'));
 assert.notEqual(key,demandGenCacheKey('postgres://other:secret@host/db',args,'2026-10-29'));
 assert.notEqual(key,demandGenCacheKey('postgres://user:secret@host/db',args,'2026-10-30'));
});

test('inactive cached data stops polling, but remains available when the user returns',async()=>{
 let now=0;const cache=createDemandGenLocalCache<number>({now:()=>now,retentionMs:60});let calls=0;
 await cache.get('key',async()=>++calls);now=61;await cache.refreshActive();
 assert.equal(calls,1);assert.equal(await cache.get('key',async()=>++calls),1);
 await cache.refreshActive();assert.equal(await cache.get('key',async()=>++calls),2);
});

test('capacity stays bounded while cold reads are pending and waiting reads are deduplicated',async()=>{
 const cache=createDemandGenLocalCache<number>({maxEntries:1});const first=deferred<number>(),second=deferred<number>();let firstCalls=0,secondCalls=0;
 const a=cache.get('a',()=>{firstCalls++;return first.promise;});
 const b=cache.get('b',()=>{secondCalls++;return second.promise;});
 const bAgain=cache.get('b',()=>{secondCalls++;return second.promise;});
 await Promise.resolve();assert.equal(firstCalls,1);assert.equal(secondCalls,0);
 first.resolve(1);assert.equal(await a,1);
 // Wait for the capacity waiter to start the second query.
 await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(secondCalls,1);
 second.resolve(2);assert.deepEqual(await Promise.all([b,bAgain]),[2,2]);
});
