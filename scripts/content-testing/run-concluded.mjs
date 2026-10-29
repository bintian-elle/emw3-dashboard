import nextEnv from '@next/env';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {publishConcluded} from './publish-concluded.mjs';

nextEnv.loadEnvConfig(process.cwd());
const db=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
const run=(cmd,args)=>new Promise((resolve,reject)=>{const child=spawn(cmd,args,{stdio:'inherit',env:process.env});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`${cmd} failed (${code})`)));});
const slugs={'Google':'google-search','Google Search':'google-search','Google PMAX':'google-pmax','Google Demand Gen':'google-demand-gen','Meta':'meta','Reddit':'reddit','EDM':'edm'};
await db.connect();
try {
 const definitions=JSON.parse(await readFile('config/concluded-tests.json','utf8'));
 for(const test of definitions){
  if(!/^[-a-z0-9]+$/.test(test.id)||!slugs[test.channel])throw Error(`Unsupported concluded test ${test.id}`);
  const existing=await db.query("select prompt_version from testing_ai_readout_cache where cache_key=$1",[`period:concluded:${test.id}`]);
  if(existing.rows[0]?.prompt_version==='concluded-channel-prompts-v1')continue;
  const snapshotPath=path.join(process.env.CONCLUDED_TEST_SNAPSHOT_DIR||'.state/concluded-tests',`${test.id}.json`);
  let snapshot;try{snapshot=JSON.parse(await readFile(snapshotPath,'utf8'));}catch(error){if(error.code==='ENOENT'){console.log(JSON.stringify({test:test.id,status:'awaiting_final_snapshot'}));continue;}throw error;}
  const end=snapshot.report?.period?.end,deadline=end?new Date(`${end}T00:00:00Z`).getTime()+10*86400000:Infinity;
  if(!snapshot.finalized||!Number.isFinite(deadline)||Date.now()<deadline){console.log(JSON.stringify({test:test.id,status:'awaiting_final_snapshot'}));continue;}
  const prompt=await readFile(`prompts/content-testing/${slugs[test.channel]}.md`),hash=createHash('sha256').update(prompt).digest('hex').slice(0,12);
  const root=path.resolve('.state/content-testing-concluded',`${test.id}-${hash}`);await mkdir(root,{recursive:true,mode:0o700});
  const definition=path.join(root,'definition.json');await writeFile(definition,JSON.stringify(test),{mode:0o600});
  const python=process.env.CONTENT_TESTING_PYTHON||'/home/ubuntu/work/anc-slack-bridge/.venv/bin/python';
  await run(python,['scripts/content-testing/prepare-concluded.py','--root',root,'--snapshot',snapshotPath,'--definition',definition,'--prompts',path.resolve('prompts/content-testing')]);
  await run(python,['scripts/content-testing/run-preview.py','--root',root,'--report',slugs[test.channel]]);
  console.log(JSON.stringify(await publishConcluded({root,backupDir:path.resolve('.state/content-testing-concluded/backups')})));
 }
}finally{await db.end();}
