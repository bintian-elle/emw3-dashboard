import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {readStagingReleaseStatus} from './staging-release.ts';
test('release badge uses deployment state and fails safely when unknown',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'staging-release-')),file=join(directory,'status.json');
 try{
 assert.deepEqual(await readStagingReleaseStatus(file),{state:'unknown'});
 await writeFile(file,JSON.stringify({state:'synced'}));
 assert.deepEqual(await readStagingReleaseStatus(file),{state:'synced'});
 await writeFile(file,JSON.stringify({state:'pending'}));
 assert.deepEqual(await readStagingReleaseStatus(file),{state:'pending'});
 await writeFile(file,'not-json');assert.deepEqual(await readStagingReleaseStatus(file),{state:'unknown'});
 await writeFile(file,JSON.stringify({productionRevision:'unknown',previewRevision:'unknown'}));assert.deepEqual(await readStagingReleaseStatus(file),{state:'unknown'});
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('pending release exposes a bounded plain-text bilingual summary only while updates are pending',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'staging-summary-')),file=join(directory,'status.json');
 const value={state:'pending',summary:{zh:'  优化素材预览和分析说明  ',en:'  Improve creative previews and analysis labels  '}};
 try{
  await writeFile(file,JSON.stringify(value));assert.deepEqual(await readStagingReleaseStatus(file),{state:'pending',summary:{zh:value.summary.zh.trim(),en:value.summary.en.trim()}});
  await writeFile(file,JSON.stringify({...value,state:'synced'}));assert.deepEqual(await readStagingReleaseStatus(file),{state:'synced'});
  await writeFile(file,JSON.stringify({...value,summary:{zh:'x'.repeat(241),en:42}}));assert.deepEqual(await readStagingReleaseStatus(file),{state:'pending'});
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('review destinations are published only for pending known changes',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'staging-links-')),file=join(directory,'status.json');
 try{
  const value={state:'pending',changeIds:['social-post-order','https://evil.example']};
  await writeFile(file,JSON.stringify(value));assert.deepEqual((await readStagingReleaseStatus(file)).changes?.map(change=>change.id),['social-post-order']);
  await writeFile(file,JSON.stringify({...value,state:'synced'}));assert.equal((await readStagingReleaseStatus(file)).changes,undefined);
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('deployment records the review state directly without comparing revisions',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'staging-state-')),file=join(directory,'status.json');
 try{
  await writeFile(file,JSON.stringify({state:'synced',changeIds:['testing-layout']}));
  assert.deepEqual(await readStagingReleaseStatus(file),{state:'synced'});
  await writeFile(file,JSON.stringify({state:'pending',changeIds:['testing-layout'],summary:{zh:'布局更新'}}));
  const value=await readStagingReleaseStatus(file);assert.equal(value.state,'pending');assert.equal(value.changes?.[0].id,'testing-layout');
 }finally{await rm(directory,{recursive:true,force:true});}
});
