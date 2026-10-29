import nextEnv from '@next/env';
import pg from 'pg';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {decodePromptPreviewReport} from '../../lib/testing-prompt-preview.ts';

export function buildConcludedPayload(manifest,packet,rawReport) {
 const source=manifest.reports?.[0];if(!source||manifest.reports.length!==1)throw Error('Expected one concluded channel report.');
 const report=decodePromptPreviewReport(rawReport,manifest.run_id,source.report_id);
 const test=packet.tests?.[0],id=test?.test_id,period=packet.period;
 if(!report||report.scope!=='lifetime'||report.period.label!==period.label||!Array.isArray(packet.required_sections)||report.sections.length!==packet.required_sections.length||report.sections.some(section=>!section.markdown.trim())||!id||!/^[-a-z0-9]+$/.test(id)||!test.snapshot_finalized||packet.tests.length!==1||period.concludedTestId!==id||report.period.start!==period.start||report.period.end!==period.end||report.campaigns.length!==1||report.campaigns[0].test_id!==id||!report.campaigns[0].summary.trim()||!report.campaigns[0].detail_markdown.trim())throw Error('Invalid or incomplete concluded report; existing data retained.');
 const key=`period:concluded:${id}`,campaign=report.campaigns[0];
 const payload={schema_version:'1.0',run_mode:'period_readout',period,captured_at:packet.captured_at,channel_reports:[report],tests:[{test_id:id,campaign_name:test.campaign_name,channel:packet.channel,summary:campaign.summary,preview_sections:[...report.sections,{title:'',markdown:campaign.detail_markdown}]}]};
 return {key,id,period,payload,report};
}

export async function publishConcluded({root,backupDir}) {
 const manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
 const source=manifest.reports?.[0];if(!source||manifest.reports.length!==1)throw Error('Expected one concluded channel report.');
 const packet=JSON.parse(await readFile(path.join(root,'inputs',`${source.report_id}.json`),'utf8'));
 const rawReport=JSON.parse(await readFile(path.join(root,'results',`${source.report_id}.json`),'utf8'));
 const {key,id,period,payload,report}=buildConcludedPayload(manifest,packet,rawReport);
 nextEnv.loadEnvConfig(process.cwd());const db=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});await db.connect();
 try {
  await db.query('begin');await db.query('select pg_advisory_xact_lock(72929002)');
  const old=await db.query('select * from testing_ai_readout_cache where cache_key=$1 for update',[key]);
  const translations=await db.query('select * from testing_ai_readout_translations where cache_key=$1',[key]);
  await mkdir(backupDir,{recursive:true,mode:0o700});await writeFile(path.join(backupDir,`${id}-${randomUUID()}.json`),JSON.stringify({records:old.rows,translations:translations.rows}),{mode:0o600});
  await db.query(`insert into testing_ai_readout_cache(cache_key,readout_type,period_label,period_start,period_end,prompt_version,payload,generated_at,updated_at) values($1,'period',$2,$3::date,$4::date,'concluded-channel-prompts-v1',$5::jsonb,now(),now()) on conflict(cache_key) do update set period_label=excluded.period_label,period_start=excluded.period_start,period_end=excluded.period_end,prompt_version=excluded.prompt_version,payload=excluded.payload,generated_at=excluded.generated_at,updated_at=excluded.updated_at`,[key,period.label,period.start,period.end,JSON.stringify(payload)]);
  await db.query('delete from testing_ai_readout_translations where cache_key=$1',[key]);
  const saved=(await db.query('select * from testing_ai_readout_cache where cache_key=$1',[key])).rows[0];await db.query('commit');
  try { const dir=process.env.CONCLUDED_READOUT_CACHE_DIR||path.join(process.cwd(),'.state/testing-concluded-readouts');await mkdir(dir,{recursive:true,mode:0o700});const target=path.join(dir,`${id}.json`),tmp=`${target}.${randomUUID()}.tmp`;await writeFile(tmp,JSON.stringify(saved),{mode:0o600});await rename(tmp,target); } catch(error) { console.error('Local mirror unavailable:',error.message); }
  return {cache_key:key,sections:report.sections.length,backup:backupDir};
 }catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{await db.end();}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [root,backupDir]=process.argv.slice(2);if(!root||!backupDir)throw Error('Usage: publish-concluded.mjs RUN_FOLDER BACKUP_FOLDER');console.log(JSON.stringify(await publishConcluded({root,backupDir})));}
