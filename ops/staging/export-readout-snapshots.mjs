import nextEnv from '@next/env';
import pg from 'pg';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {join} from 'node:path';
const root=process.cwd();nextEnv.loadEnvConfig(root);
if(process.env.DEPLOYMENT_ENV!=='staging')throw Error('Only export for a local staging preview');
const db=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000,statement_timeout:10000});
try{await db.connect();await db.query('BEGIN READ ONLY');const records=await db.query("select cache_key,readout_type,period_label,period_start::text,period_end::text,comparison_label,comparison_start::text,comparison_end::text,prompt_version,payload,generated_at,updated_at from testing_ai_readout_cache where readout_type='period'");const translations=await db.query("select cache_key,source_hash,payload from testing_ai_readout_translations where language='zh'");await db.query('ROLLBACK');
 const bundle={version:1,capturedAt:new Date().toISOString(),records:records.rows.map(source=>{const t=translations.rows.find(t=>t.cache_key===source.cache_key);return {source,...(t?{translation:{sourceHash:t.source_hash,payload:t.payload}}:{})};})};
 const directory=join(root,'.state/staging-ai-readouts'),snapshot='published-'+Date.now();await mkdir(join(directory,snapshot),{recursive:true,mode:0o700});await writeFile(join(directory,snapshot,'published.json'),JSON.stringify(bundle),{mode:0o600});await writeFile(join(directory,'active.json.tmp'),JSON.stringify({snapshot}),{mode:0o600});await rename(join(directory,'active.json.tmp'),join(directory,'active.json'));
 console.log(JSON.stringify({english:records.rows.length,chinese:translations.rows.length,snapshot,onlineWrites:0}));
}finally{await db.end();}
