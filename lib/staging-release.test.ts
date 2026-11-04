import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {readStagingReleaseStatus} from './staging-release.ts';
test('release badge compares published content revisions and fails safely when unknown',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'staging-release-')),file=join(directory,'status.json');
 try{
 assert.deepEqual(await readStagingReleaseStatus(file),{state:'unknown'});
 await writeFile(file,JSON.stringify({productionRevision:'a'.repeat(40),previewRevision:'a'.repeat(40)}));
 assert.deepEqual(await readStagingReleaseStatus(file),{state:'synced'});
 await writeFile(file,JSON.stringify({productionRevision:'a'.repeat(40),previewRevision:'b'.repeat(40)}));
 assert.deepEqual(await readStagingReleaseStatus(file),{state:'pending'});
 await writeFile(file,'not-json');assert.deepEqual(await readStagingReleaseStatus(file),{state:'unknown'});
 await writeFile(file,JSON.stringify({productionRevision:'unknown',previewRevision:'unknown'}));assert.deepEqual(await readStagingReleaseStatus(file),{state:'unknown'});
 }finally{await rm(directory,{recursive:true,force:true});}
});
