import nextEnv from '@next/env';
import pg from 'pg';
import path from 'node:path';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {dailyPresets} from './daily-policy.mjs';
import {publishReports,loadReports} from './publish-reports.mjs';
import {runDailyStages} from './daily-stages.mjs';
import {isDeepStrictEqual} from 'node:util';
import {testingReadoutContent} from '../../lib/testing-readout-content.ts';
nextEnv.loadEnvConfig(process.cwd());
const db=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
const run=(cmd,args)=>new Promise((resolve,reject)=>{const child=spawn(cmd,args,{stdio:'inherit',env:process.env});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Controller failed: ${cmd} (${code})`)));});
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const weekday=new Date(`${today}T12:00:00Z`).getUTCDay();
const day=new Date(`${today}T12:00:00Z`),sinceTuesday=(weekday+5)%7;
const iso=days=>{const result=new Date(day);result.setUTCDate(result.getUTCDate()+days);return result.toISOString().slice(0,10);};
const weeklyKey=`period:last-week-tue-mon:${iso(-sinceTuesday-7)}:${iso(-sinceTuesday-1)}`;
await db.connect();
try{
 const lock=await db.query('select pg_try_advisory_lock(72929003) locked');if(!lock.rows[0].locked)throw Error('Daily channel generation is already running.');
 const saved=await db.query("select 1 from testing_ai_readout_cache where cache_key=$1 and payload ? 'channel_reports'",[weeklyKey]);
 // Last Week is generated on Tuesday, or once to catch up if its exact range is missing.
 const presets=dailyPresets(weekday,Boolean(saved.rowCount));
 const root=path.resolve('.state/content-testing-daily',today);await mkdir(root,{recursive:true,mode:0o700});
 const snapshot=path.join(root,'snapshot.json');
 const secret=process.env.CRON_SECRET?.trim()||process.env.AI_WORKER_SECRET?.trim();if(!secret)throw Error('Refresh credential missing.');
 let existingSnapshot=false;try{JSON.parse(await readFile(snapshot,'utf8'));existingSnapshot=true;}catch(error){if(error.code!=='ENOENT')throw error;}
 if(!existingSnapshot){
 const response=await fetch('http://127.0.0.1:3000/api/testing/readouts/refresh',{method:'POST',headers:{authorization:`Bearer ${secret}`,'content-type':'application/json'},body:JSON.stringify({snapshotOnly:true,presets}),signal:AbortSignal.timeout(600000)});
 if(!response.ok)throw Error(`Dashboard snapshot failed: ${response.status}`);
 await writeFile(snapshot,JSON.stringify(await response.json()),{mode:0o600});
 }
 const python=process.env.CONTENT_TESTING_PYTHON||'/home/ubuntu/work/anc-slack-bridge/.venv/bin/python';
 let first;
 const stages=await runDailyStages({presets,onError:failure=>console.error(JSON.stringify(failure)),generate:async preset=>{
  const folder=path.join(root,`${today}-${preset.toLowerCase()}`),label={lastWeek:'Last Week (Tue–Mon)',wtd:'Week-to-date',mtd:'Month-to-date'}[preset];
  await run(python,['scripts/content-testing/prepare-daily.py','--root',folder,'--snapshot',snapshot,'--period',label,'--prompts',path.resolve('prompts/content-testing'),...(first?['--reuse',first]:[])]);
  await run(python,['scripts/content-testing/run-preview.py','--root',folder]);
  await run(process.execPath,['--experimental-strip-types','scripts/content-testing/polish-preview.mjs',path.join(folder,'results')]);
  // Resume completed output without deleting its saved translation or rerunning inference.
  const rows=(await loadReports(folder)).filter(row=>!first||!['period:reddit-lifetime','period:social-lifetime'].includes(row.cache_key));
  const existing=await db.query('select cache_key,payload from testing_ai_readout_cache where cache_key=any($1::text[])',[rows.map(row=>row.cache_key)]);
  const alreadyPublished=rows.every(row=>isDeepStrictEqual(existing.rows.find(saved=>saved.cache_key===row.cache_key)?.payload,testingReadoutContent(row.cache_key,row.payload)));
  if(!alreadyPublished){const result=await publishReports({english:folder,includeLifetimes:!first,backupDir:path.join(root,`backup-${preset}`)});console.log(JSON.stringify(result));}
  else console.log(JSON.stringify({status:'already_published',preset}));
  first??=folder;
 },concluded:()=>run(process.execPath,['--experimental-strip-types','scripts/content-testing/run-concluded.mjs']),
 translate:()=>run(process.execPath,['scripts/refresh-testing-readouts.mjs','--translations-only'])});
 await writeFile(path.join(root,'completion.json'),JSON.stringify({completedAt:new Date().toISOString(),...stages},null,2),{mode:0o600});
 if(stages.errors.length)throw Error(stages.errors.map(item=>`${item.stage}: ${item.error}`).join('; '));
}finally{await db.end();}
