import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {stagingSnapshotFile,readStagingDataSnapshot} from './staging-data-snapshots.ts';
test('frozen snapshot reads preserve scope, payload and publication time',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'staging-data-'));
 const scope=JSON.stringify({preset:'lastWeek',start:'2026-10-27',end:'2026-11-02'});
 const row={channel:'meta',scope,payload:{data:{revenue:123},daily:[]},updatedAt:'2026-11-03T09:00:00.000Z'};
 try{await writeFile(join(directory,stagingSnapshotFile('meta',scope)),JSON.stringify(row));
 assert.deepEqual(await readStagingDataSnapshot(directory,'meta',scope),{payload:row.payload,updatedAt:row.updatedAt});
 assert.equal(await readStagingDataSnapshot(directory,'meta','another-period'),null);
 assert.equal(await readStagingDataSnapshot(directory,'reddit',scope),null);
 await writeFile(join(directory,stagingSnapshotFile('meta','latest')),JSON.stringify(row));
 assert.equal((await readStagingDataSnapshot(directory,'meta','latest',true))?.updatedAt,row.updatedAt);
 await writeFile(join(directory,stagingSnapshotFile('meta',scope)),JSON.stringify({...row,scope:'wrong'}));
 await assert.rejects(readStagingDataSnapshot(directory,'meta',scope));
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('snapshot filenames never expose raw scopes or accept path traversal',()=>{
 assert.match(stagingSnapshotFile('../channel','../../private'),/^[a-f0-9]{64}\.json$/);
 assert.notEqual(stagingSnapshotFile('meta','a'),stagingSnapshotFile('meta','b'));
});
test('missing frozen scopes fail closed instead of falling through to a live source',async()=>{
 const {requireStagingDataSnapshot}=await import('./staging-data-snapshots.ts');
 const directory=await mkdtemp(join(tmpdir(),'staging-required-'));
 try{await assert.rejects(requireStagingDataSnapshot(directory,'meta','unpublished'),/not available in this staging snapshot/);}finally{await rm(directory,{recursive:true,force:true});}
});
