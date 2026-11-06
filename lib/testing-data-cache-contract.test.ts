import test from 'node:test';
import assert from 'node:assert/strict';
import {testingDataSnapshotKey} from './testing-data-cache-contract.ts';

test('range-bound snapshots are shared only for the same reporting period',()=>{
 const now=new Date('2026-10-28T18:00:00.000Z');
 const first=testingDataSnapshotKey('meta',{preset:'mtd'},now);
 assert.equal(first,testingDataSnapshotKey('meta',{preset:'mtd'},now));
 assert.notEqual(first,testingDataSnapshotKey('meta',{preset:'lastWeek'},now));
 assert.notEqual(first,testingDataSnapshotKey('meta',{preset:'mtd'},new Date('2026-10-29T18:00:00.000Z')));
});
test('a complete Google source snapshot covers all reporting periods',()=>{
 const now=new Date('2026-10-28T18:00:00.000Z');
 assert.equal(testingDataSnapshotKey('google-search',{preset:'mtd'},now),'all');
 assert.equal(testingDataSnapshotKey('google-search',{preset:'lastWeek'},now),'all');
 assert.equal(testingDataSnapshotKey('social',{preset:'lastWeek'},now),'all');
});
test('Reddit default snapshot matches its since-start period',()=>{
 const now=new Date('2026-10-28T18:00:00.000Z');
 assert.equal(testingDataSnapshotKey('reddit',{},now),testingDataSnapshotKey('reddit',{preset:'sinceSep24'},now));
 assert.notEqual(testingDataSnapshotKey('reddit',{},now),testingDataSnapshotKey('reddit',{preset:'lastWeek'},now));
});

test('staging custom-range fallback keeps the exact same dates',async()=>{
 const {equivalentTestingDataScopes}=await import('./testing-data-cache-contract.ts');
 const custom=JSON.stringify({preset:'custom',start:'2026-10-27',end:'2026-11-02'});
 const candidates=equivalentTestingDataScopes(custom);
 assert.equal(candidates[0],custom);
 assert.ok(candidates.includes(JSON.stringify({preset:'lastWeek',start:'2026-10-27',end:'2026-11-02'})));
 assert.ok(candidates.every(candidate=>{const value=JSON.parse(candidate);return value.start==='2026-10-27'&&value.end==='2026-11-02';}));
 assert.deepEqual(equivalentTestingDataScopes('all'),['all']);
 assert.deepEqual(equivalentTestingDataScopes(JSON.stringify({preset:'mtd',start:'2026-10-01',end:'2026-10-31'})),[JSON.stringify({preset:'mtd',start:'2026-10-01',end:'2026-10-31'})]);
 const weekly=equivalentTestingDataScopes(JSON.stringify({preset:'lastWeek',start:'2026-10-27',end:'2026-11-02'}));
 assert.ok(weekly.includes(custom));
});
