import nextEnv from '@next/env';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {channelReportRecords,decodePromptPreviewReport} from '../../lib/testing-prompt-preview.ts';
import {testingReadoutContent} from '../../lib/testing-readout-content.ts';

export async function loadReports(folder){
 const manifest=JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8'));
 const ids=[...(manifest.reports??[]).map(report=>report.report_id),'overview'];
 const reports=[];
 for(const id of ids){
  const report=decodePromptPreviewReport(JSON.parse(await readFile(path.join(folder,'results',`${id}.json`),'utf8')),manifest.run_id,id);
  if(!report)throw Error(`Invalid report: ${id}`);
  reports.push(report);
 }
 return channelReportRecords(manifest,reports);
}

export async function publishReports({english,chinese,backupDir,replaceToday=false,includeLifetimes=true}){
 const selected=rows=>rows.filter(row=>includeLifetimes||!['period:reddit-lifetime','period:social-lifetime'].includes(row.cache_key));
 const en=selected(await loadReports(english)),zh=chinese?selected(await loadReports(chinese)):[];
 if(chinese&&JSON.stringify(en.map(row=>row.cache_key))!==JSON.stringify(zh.map(row=>row.cache_key)))throw Error('Translation periods do not match.');
 nextEnv.loadEnvConfig(process.cwd());
 const db=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
 await db.connect();
 try{
  await db.query('begin');
  await db.query('select pg_advisory_xact_lock(72929002)');
  const keys=en.map(row=>row.cache_key);
  const old=await db.query(`select * from testing_ai_readout_cache where cache_key=any($1::text[]) or ($2 and readout_type='period' and cache_key not like 'period:concluded:%' and (generated_at at time zone 'America/Chicago')::date=(now() at time zone 'America/Chicago')::date) for update`,[keys,replaceToday]);
  const oldKeys=[...new Set([...keys,...old.rows.map(row=>row.cache_key)])];
  const translations=await db.query('select * from testing_ai_readout_translations where cache_key=any($1::text[])',[oldKeys]);
  await mkdir(backupDir,{recursive:true,mode:0o700});
  await writeFile(path.join(backupDir,'previous-cache.json'),JSON.stringify({records:old.rows,translations:translations.rows},null,2),{mode:0o600});
  await db.query('delete from testing_ai_readout_translations where cache_key=any($1::text[])',[oldKeys]);
  await db.query('delete from testing_ai_readout_cache where cache_key=any($1::text[])',[oldKeys]);
  for(const [index,row] of en.entries()){
   const payload=testingReadoutContent(row.cache_key,row.payload),period=payload.period;
   await db.query(`insert into testing_ai_readout_cache(cache_key,readout_type,period_label,period_start,period_end,prompt_version,payload,generated_at) values($1,'period',$2,$3::date,$4::date,'channel-prompts-v1',$5::jsonb,now())`,[row.cache_key,period.label,period.start,period.end,JSON.stringify(payload)]);
   if(chinese){const stored=(await db.query('select payload from testing_ai_readout_cache where cache_key=$1',[row.cache_key])).rows[0].payload;const hash=createHash('sha256').update(JSON.stringify(testingReadoutContent(row.cache_key,stored))).digest('hex');await db.query(`insert into testing_ai_readout_translations(cache_key,language,source_hash,payload) values($1,'zh',$2,$3::jsonb)`,[row.cache_key,hash,JSON.stringify(zh[index].payload)]);}
  }
  await db.query('commit');
  const saved=await db.query('select cache_key,payload from testing_ai_readout_cache where cache_key=any($1::text[])',[keys]);
  for(const row of en){if(JSON.stringify(saved.rows.find(saved=>saved.cache_key===row.cache_key)?.payload)!==JSON.stringify(row.payload)){
   // PostgreSQL jsonb normalizes object order; compare canonical trees instead.
   const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
   if(canonical(saved.rows.find(saved=>saved.cache_key===row.cache_key)?.payload)!==canonical(row.payload))throw Error('Published payload verification failed.');
  }}
  return {saved:keys,removed:old.rows.length,translations:zh.length,backupDir};
 }catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{await db.end();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [english,chinese,backupDir]=process.argv.slice(2).filter(value=>!value.startsWith('--'));
 if(!english||!backupDir)throw Error('Usage: publish-reports.mjs EN_DIR ZH_DIR_OR_DASH BACKUP_DIR [--replace-today]');
 console.log(JSON.stringify(await publishReports({english,chinese:chinese==='-'?null:chinese,backupDir,replaceToday:process.argv.includes('--replace-today')})));
}
