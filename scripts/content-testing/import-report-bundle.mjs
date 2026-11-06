import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import env from '@next/env';
import pg from 'pg';
import {storeReportBundle} from './report-store.mjs';
import {reportMediaType} from './report-media.mjs';

env.loadEnvConfig(process.cwd());
const root=path.resolve(process.argv[2]??'');
if(!process.argv[2])throw Error('Provide a completed bundle directory');
const read=async name=>JSON.parse(await readFile(path.join(root,name),'utf8'));
const manifest=await read('manifest.json'),bundle=await read('compiled.json'),checksums=await read('checksums.json'),index=await read('media-index.json');
const hash=value=>createHash('sha256').update(value).digest('hex');
if(manifest.status!=='completed'||manifest.run_id!==bundle.run_id||checksums.run_id!==bundle.run_id||checksums.compiled!==hash(await readFile(path.join(root,'compiled.json'))))throw Error('Report bundle incomplete or checksum mismatch');
const reports=[];for(const entry of manifest.reports){const report=bundle.reports[entry.report_id];if(!report?.en||!report?.zh)throw Error(`Missing bilingual report: ${entry.report_id}`);reports.push({channel:entry.report_id,scope:entry.scope,report});}
const media=[];for(const item of index){if(!/^[-\w]+\.(webp|png|jpe?g|gif|mp4|webm|avif)$/i.test(item.file))throw Error('Invalid media filename');const body=await readFile(path.join(root,'media',item.file));if(hash(body)!==item.sha256)throw Error(`Media mismatch: ${item.key}`);const {source_path,...metadata}=item;void source_path;media.push({key:item.key,mimeType:reportMediaType(item.file,body),sha256:item.sha256,body,metadata});}
const versions={};for(const entry of manifest.reports){const input=await read(`inputs/${entry.report_id}.json`);versions[entry.report_id]={analysis:input.prompt_sha256,readability:input.readability_sha256};}
const input=await read('inputs/overview.json');
const sourceFreshness=await read('source-freshness.json');
const run={sourceFreshness,id:manifest.run_id,kind:'weekly',start:manifest.period.start,end:manifest.period.end,compareStart:manifest.comparison.start,compareEnd:manifest.comparison.end,sourceCheckedAt:input.captured_at,promptVersions:versions};
const client=new pg.Client({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
await client.connect();try{await storeReportBundle(client,{run,reports,media});console.log(JSON.stringify({run:run.id,reports:reports.length,media:media.length}));}finally{await client.end();}
