import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {dashboardCodexCatalog} from './ai-dashboard-codex-catalog.ts';
test('private per-call model catalog preserves metadata and excludes account identity',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'builder-models-'));
 try{const source=path.join(dir,'cache.json'),models=[{slug:'existing-model',base_instructions:'existing upstream model instructions'}];await writeFile(source,JSON.stringify({identity:'private account',fetched_at:'now',models}));const output=await dashboardCodexCatalog(dir,source);assert.ok(output);assert.deepEqual(JSON.parse(await readFile(output,'utf8')),{models});assert.equal((await stat(output)).mode&0o777,0o600);assert.ok((await readFile(source,'utf8')).includes('private account'));}finally{await rm(dir,{recursive:true,force:true});}
});
test('absent or invalid catalogs leave normal CLI startup available',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'builder-models-'));try{assert.equal(await dashboardCodexCatalog(dir,path.join(dir,'missing')),null);const source=path.join(dir,'bad');await writeFile(source,'{}');assert.equal(await dashboardCodexCatalog(dir,source),null);}finally{await rm(dir,{recursive:true,force:true});}});

test('a newer desktop catalog cannot silently change an older CLI model selection',async()=>{const dir=await mkdtemp(path.join(tmpdir(),'builder-models-'));try{const file=path.join(dir,'cache.json');await writeFile(file,JSON.stringify({client_version:'0.162.1',models:[{slug:'newer-model'}]}));assert.equal(await dashboardCodexCatalog(dir,file,'0.154.0'),null);assert.ok(await dashboardCodexCatalog(dir,file,'0.162.1'));}finally{await rm(dir,{recursive:true,force:true});}});
