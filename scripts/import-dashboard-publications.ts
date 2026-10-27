import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {PROJECTS} from '../lib/ai-dashboard-options.ts';
import {validatePublishedOverview,publishedOverviewFile} from '../lib/ai-dashboard-published.ts';
import {upsertPublicationInTransaction,publicationDatabaseClient,closePublicationDatabase} from '../lib/ai-dashboard-publication-store.ts';
const args=process.argv.slice(2);if(args.some(a=>!['--write','--apply-migration'].includes(a)))throw Error('Unknown publication import argument.');if(args.includes('--apply-migration')&&!args.includes('--write'))throw Error('Migration requires explicit --write.');
const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):value;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
async function main(){const snapshots=await Promise.all(PROJECTS.map(async p=>validatePublishedOverview(JSON.parse(await readFile(publishedOverviewFile(p.id),'utf8')),p.id)));const results=[];
 if(args.includes('--write')){const client=await publicationDatabaseClient();try{await client.query('begin');await client.query('set local search_path=public');if(args.includes('--apply-migration')){const migration=(await readFile(path.join(process.cwd(),'sql/dashboard-overview-publications.sql'),'utf8')).replace(/^begin;\s*$/gmi,'').replace(/^commit;\s*$/gmi,'');await client.query(migration);}for(const snapshot of snapshots){await upsertPublicationInTransaction(client,snapshot);const readback=await client.query('select payload from public.dashboard_overview_publications where project=$1',[snapshot.project]);const persisted=validatePublishedOverview(readback.rows[0]?.payload,snapshot.project);if(hash(persisted)!==hash(snapshot))throw Error('Imported publication hash did not match.');results.push({project:snapshot.project,range:snapshot.range,status:'imported',sha256:hash(persisted)});}await client.query('commit');}catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{client.release();}}
 else for(const snapshot of snapshots)results.push({project:snapshot.project,range:snapshot.range,status:'dry_run',sha256:hash(snapshot)});
 console.log(JSON.stringify({write:args.includes('--write'),results}));}
try{await main();}catch(error){const code=(error as {code?:unknown})?.code;console.error(JSON.stringify({error:'Publication import was not confirmed; inspect the database before retrying.',code:typeof code==='string'&&/^[A-Z0-9_]{1,40}$/.test(code)?code:'PUBLICATION_IMPORT_FAILED'}));process.exitCode=1;}finally{await closePublicationDatabase();}
