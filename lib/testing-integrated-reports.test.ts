import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,writeFile,rm} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {readIntegratedReports} from './testing-integrated-reports.ts';
test('production ignores the bundle; staging accepts only completed matching immutable results',async()=>{
 const root=await mkdtemp(join(tmpdir(),'integrated-reports-')),prior={deployment:process.env.DEPLOYMENT_ENV,directory:process.env.STAGING_CONTENT_TESTING_REPORT_DIR};
 try{
  process.env.STAGING_CONTENT_TESTING_REPORT_DIR=root;process.env.DEPLOYMENT_ENV='production';assert.equal(await readIntegratedReports(),null);
  const period={start:'2026-10-27',end:'2026-11-02'},manifest={run_id:'test',period,status:'running'};await writeFile(join(root,'manifest.json'),JSON.stringify(manifest));process.env.DEPLOYMENT_ENV='staging';assert.equal(await readIntegratedReports(),null);
  const bundle={run_id:'test',period,reports:{}},raw=JSON.stringify(bundle);await writeFile(join(root,'compiled.json'),raw);await writeFile(join(root,'checksums.json'),JSON.stringify({run_id:'test',compiled:createHash('sha256').update(raw).digest('hex')}));manifest.status='completed';await writeFile(join(root,'manifest.json'),JSON.stringify(manifest));assert.deepEqual(await readIntegratedReports(),bundle);
  await writeFile(join(root,'compiled.json'),raw+' ');await assert.rejects(readIntegratedReports(),/checksum mismatch/);
 }finally{if(prior.deployment===undefined)delete process.env.DEPLOYMENT_ENV;else process.env.DEPLOYMENT_ENV=prior.deployment;if(prior.directory===undefined)delete process.env.STAGING_CONTENT_TESTING_REPORT_DIR;else process.env.STAGING_CONTENT_TESTING_REPORT_DIR=prior.directory;await rm(root,{recursive:true,force:true});}
});
test('a local production preview can opt in to a private report bundle without enabling staging',async()=>{
 const root=await mkdtemp(join(tmpdir(),'integrated-local-preview-'));const prior={...process.env};
 try{
  process.env.DEPLOYMENT_ENV='production';process.env.LOCAL_PRODUCTION_PREVIEW='1';process.env.LOCAL_PRODUCTION_REPORT_DIR=root;
  const period={start:'2026-10-27',end:'2026-11-02'},bundle={run_id:'test',period,reports:{}};const raw=JSON.stringify(bundle);
  await writeFile(join(root,'manifest.json'),JSON.stringify({run_id:'test',period,status:'completed'}));await writeFile(join(root,'compiled.json'),raw);await writeFile(join(root,'checksums.json'),JSON.stringify({run_id:'test',compiled:createHash('sha256').update(raw).digest('hex')}));
  assert.deepEqual(await readIntegratedReports(),bundle);
  delete process.env.LOCAL_PRODUCTION_PREVIEW;assert.equal(await readIntegratedReports(),null);
 }finally{for(const key of ['DEPLOYMENT_ENV','LOCAL_PRODUCTION_PREVIEW','LOCAL_PRODUCTION_REPORT_DIR']){if(prior[key]===undefined)delete process.env[key];else process.env[key]=prior[key];}await rm(root,{recursive:true,force:true});}
});
