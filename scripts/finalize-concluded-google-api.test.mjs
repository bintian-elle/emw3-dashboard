import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {finalizeConcludedGoogleApi,validateAdTotals,readFrozenAds} from './finalize-concluded-google-api.mjs';
test('finalized snapshot never requests API or overwrites files',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'concluded-freeze-'));
 try{await writeFile(path.join(directory,'example.json'),JSON.stringify({finalized:true}));
 const result=await finalizeConcludedGoogleApi({test:{id:'example',experimentId:'123'},directory,creativeDirectory:directory,search:()=>{throw Error('API must not run');}});
 assert.equal(result.status,'already frozen');
 }finally{await rm(directory,{recursive:true,force:true});}
});
test('mismatched ad spend cannot be frozen',()=>{
 const row=cost=>({campaign:{id:'123'},metrics:{costMicros:cost}});
 assert.throws(()=>validateAdTotals([row(1000000)],[row(2000000)],['123']),/totals differ/);
});
test('frozen archive reader preserves exact saved ad rows',async()=>{
 const {mkdir}=await import('node:fs/promises');const directory=await mkdtemp(path.join(tmpdir(),'concluded-ads-'));
 try{await mkdir(path.join(directory,'frozen-experiments'));const record={finalized:true,campaignIds:['123'],days:[{adId:'456',spend:1.23}]};await writeFile(path.join(directory,'frozen-experiments/test.json'),JSON.stringify(record));assert.deepEqual(await readFrozenAds(directory),[record]);}finally{await rm(directory,{recursive:true,force:true});}
});
