import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {readStagingReadoutSnapshot,localStagingReadoutDirectory} from './staging-readout-snapshots.ts';
const key='period:last-week-tue-mon:2026-10-27:2026-11-02';
const payload={tests:[{test_id:'test',summary:'English analysis'}]};
const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
test('offline staging reads saved English and matching Chinese without querying a database',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'staging-insights-'));
 try{await mkdir(join(dir,'test'));await writeFile(join(dir,'active.json'),JSON.stringify({snapshot:'test'}));await writeFile(join(dir,'test/published.json'),JSON.stringify({version:1,records:[{source:{cache_key:key,payload},translation:{sourceHash:hash,payload:{tests:[{test_id:'test',summary:'中文分析'}]}}}]}));
 assert.deepEqual((await readStagingReadoutSnapshot(dir,[key],'en'))?.[0].payload,payload);
 assert.deepEqual((await readStagingReadoutSnapshot(dir,[key],'zh'))?.[0].payload,{tests:[{test_id:'test',summary:'中文分析'}]});
 assert.deepEqual(await readStagingReadoutSnapshot(dir,['another-period'],'zh'),[]);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('stale translations are not paired with replaced English reports',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'staging-stale-'));
 try{await mkdir(join(dir,'test'));await writeFile(join(dir,'active.json'),JSON.stringify({snapshot:'test'}));await writeFile(join(dir,'test/published.json'),JSON.stringify({version:1,records:[{source:{cache_key:key,payload},translation:{sourceHash:'old',payload:{summary:'stale'}}}]}));
 const record=(await readStagingReadoutSnapshot(dir,[key],'zh'))?.[0];assert.deepEqual(record?.payload,{...payload,_translation_pending:true});
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('missing snapshot and production never enable the local override',async()=>{const dir=await mkdtemp(join(tmpdir(),'staging-empty-'));try{assert.equal(await readStagingReadoutSnapshot(dir,[key],'en'),null);assert.equal(localStagingReadoutDirectory({NODE_ENV:'production',DEPLOYMENT_ENV:'staging'}),null);assert.equal(localStagingReadoutDirectory({NODE_ENV:'development',DEPLOYMENT_ENV:'production'}),null);}finally{await rm(dir,{recursive:true,force:true});}});
