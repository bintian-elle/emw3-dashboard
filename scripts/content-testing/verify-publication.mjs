import nextEnv from '@next/env';
import pg from 'pg';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {testingReadoutContent} from '../../lib/testing-readout-content.ts';
nextEnv.loadEnvConfig(process.cwd());
const db=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
await db.connect();
try{
 if(process.argv.includes('--apply-migration'))await db.query(await readFile('supabase/migrations/20261028_testing_data_snapshots.sql','utf8'));
 const rows=await db.query("select cache_key,payload,generated_at from testing_ai_readout_cache where cache_key in ('period:last-week-tue-mon:2026-10-20:2026-10-26','period:reddit-lifetime','period:social-lifetime') order by cache_key");
 const results=[];
 for(const row of rows.rows){
  const hash=createHash('sha256').update(JSON.stringify(testingReadoutContent(row.cache_key,row.payload))).digest('hex');
  const zh=await db.query("select payload,source_hash from testing_ai_readout_translations where cache_key=$1 and language='zh'",[row.cache_key]);
  results.push({key:row.cache_key,tests:row.payload.tests?.length,reports:row.payload.channel_reports?.length??0,chineseReports:zh.rows[0]?.payload.channel_reports?.length??0,translationHashMatches:zh.rows[0]?.source_hash===hash});
 }
 console.log(JSON.stringify({records:results}));
 if(process.argv.includes('--require-published')&&(results.length!==3||results.some(row=>!row.reports||row.reports!==row.chineseReports||!row.translationHashMatches)))throw Error('Published bilingual reports did not pass verification.');
}finally{await db.end();}
