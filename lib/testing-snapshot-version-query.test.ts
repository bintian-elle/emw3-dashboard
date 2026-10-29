import assert from 'node:assert/strict';
import test from 'node:test';
import {querySnapshotVersions} from './testing-snapshot-version-query.ts';

test('reads exact and latest versions in one ordered metadata-only query',async()=>{
 let calls=0;
 const versions=await querySnapshotVersions(async(sql,values)=>{
  calls++;
  assert.doesNotMatch(sql,/\bpayload\b/i);
  assert.deepEqual(values,[['meta','reddit','meta'],['week','month',''],[false,false,true]]);
  return {rows:[{updated_at:'2026-10-27T00:00:00Z',scope_key:'week'},{updated_at:null,scope_key:null},{updated_at:'2026-10-29T00:00:00Z',scope_key:'other'}]};
 },[{channel:'meta',scope:'week',latest:false},{channel:'reddit',scope:'month',latest:false},{channel:'meta',scope:'',latest:true}]);
 assert.equal(calls,1);
 assert.deepEqual(versions,[{updatedAt:'2026-10-27T00:00:00.000Z',scope:'week'},{updatedAt:null,scope:null},{updatedAt:'2026-10-29T00:00:00.000Z',scope:'other'}]);
});

test('rejects incomplete metadata instead of interpreting missing rows as deletions',async()=>{
 await assert.rejects(()=>querySnapshotVersions(async()=>({rows:[]}),[{channel:'meta',scope:'week',latest:false}]),/Incomplete/);
});
