import assert from 'node:assert/strict';
import test from 'node:test';
import {VersionedSnapshotMemory} from './testing-memory-snapshot.ts';

const old={updatedAt:'2026-10-27T12:00:00.000Z',value:'old'};
const fresh={updatedAt:'2026-10-28T12:00:00.000Z',value:'fresh'};
const newer={updatedAt:'2026-10-29T12:00:00.000Z',value:'newer'};

test('returns cached data without loading, and deduplicates a cold read',async()=>{
 const memory=new VersionedSnapshotMemory<typeof old>();
 let loads=0,finish!:(value:typeof old)=>void;
 const loader=()=>{loads++;return new Promise<typeof old>(resolve=>{finish=resolve;});};
 const first=memory.read('meta:week',loader),second=memory.read('meta:week',loader);
 assert.equal(loads,1);finish(old);
 assert.deepEqual(await first,old);assert.deepEqual(await second,old);
 assert.deepEqual(await memory.read('meta:week',async()=>{throw Error('unnecessary read');}),old);
});

test('only fetches changed scoped snapshots and retains existing data on failures',async()=>{
 const memory=new VersionedSnapshotMemory<typeof old>();memory.set('meta:week',old);memory.set('meta:month',newer);
 let reads=0;
 await memory.reconcile('meta:week',old.updatedAt,async()=>{reads++;return fresh;});
 assert.equal(reads,0);
 await memory.reconcile('meta:week',fresh.updatedAt,async()=>{reads++;throw Error('offline');});
 assert.deepEqual(memory.get('meta:week'),old);
 await memory.reconcile('meta:week',fresh.updatedAt,async()=>{reads++;return fresh;});
 assert.deepEqual(memory.get('meta:week'),fresh);
 assert.deepEqual(memory.get('meta:month'),newer);
});

test('treats confirmed deletion as authoritative without racing a newer local publish',async()=>{
 const memory=new VersionedSnapshotMemory<typeof old>();memory.set('a',old);
 await memory.reconcile('a',null,async()=>old);assert.equal(memory.get('a'),undefined);
 memory.set('a',old);let finish!:(value:typeof old|null)=>void;
 const request=memory.reconcile('a',fresh.updatedAt,()=>new Promise(resolve=>{finish=resolve;}));
 memory.set('a',newer);finish(null);await request;
 assert.deepEqual(memory.get('a'),newer);
});

test('serves the old snapshot during refresh and swaps it only after success',async()=>{
 const memory=new VersionedSnapshotMemory<typeof old>();memory.set('a',old);
 let finish!:(value:typeof old)=>void;
 const refreshing=memory.reconcile('a',fresh.updatedAt,()=>new Promise(resolve=>{finish=resolve;}));
 assert.deepEqual(await memory.read('a',async()=>{throw Error('must not fetch twice');}),old);
 finish(fresh);await refreshing;
 assert.deepEqual(await memory.read('a',async()=>{throw Error('must use updated cache');}),fresh);
});

test('a confirmed rollback uses the remaining older shared snapshot',async()=>{
 const memory=new VersionedSnapshotMemory<typeof old>();memory.set('a',newer);
 await memory.reconcile('a',old.updatedAt,async()=>old);
 assert.deepEqual(memory.get('a'),old);
});
