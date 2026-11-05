import 'server-only';
import {Pool} from 'pg';
import {createHash,randomUUID} from 'node:crypto';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {testingPromptCatalog,type PromptAuthor,type PromptId,type PromptVersion,type PromptRun,validatePromptEdit,validatePromptRun} from './testing-prompts-contract';
let pool:Pool|undefined;
export function promptDatabase(){if(!process.env.STAGING_PROMPTS_DATABASE_URL)throw Error('Prompt storage is not configured.');return pool??=new Pool({connectionString:process.env.STAGING_PROMPTS_DATABASE_URL,ssl:{rejectUnauthorized:false},max:3,connectionTimeoutMillis:5000,statement_timeout:10000});}
export async function sourcePrompt(id:PromptId):Promise<PromptVersion>{
 const entry=testingPromptCatalog.find(p=>p.id===id)!;const content=await readFile(join(process.cwd(),entry.file),'utf8');
 const idHash='source-'+createHash('sha256').update(content).digest('hex');
 await promptDatabase().query('INSERT INTO staging_testing_prompt_sources(prompt_id,id,content) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,idHash,content]);
 const row=(await promptDatabase().query('SELECT created_at FROM staging_testing_prompt_sources WHERE prompt_id=$1 AND id=$2',[id,idHash])).rows[0];
 return {id:idHash,prompt_id:id,revision:0,parent_id:null,content,previous_content:content,note:'Deployed source baseline',author:{sub:'source',name:'Deployed source',email:''},created_at:new Date(row.created_at).toISOString()};
}
export async function promptCatalog(){const result=await promptDatabase().query<PromptVersion>('SELECT DISTINCT ON(prompt_id) * FROM staging_testing_prompt_versions ORDER BY prompt_id,revision DESC');return Promise.all(testingPromptCatalog.map(async entry=>({...entry,current:result.rows.find(row=>row.prompt_id===entry.id)??await sourcePrompt(entry.id)})));}
export async function promptVersion(id:PromptId,version:string){const source=await sourcePrompt(id);if(version===source.id)return source;const result=await promptDatabase().query<PromptVersion>('SELECT * FROM staging_testing_prompt_versions WHERE prompt_id=$1 AND id=$2',[id,version]);if(result.rows[0])return result.rows[0];const old=(await promptDatabase().query('SELECT * FROM staging_testing_prompt_sources WHERE prompt_id=$1 AND id=$2',[id,version])).rows[0];if(!old)throw Error('Prompt version is unavailable.');return {...source,id:old.id,content:old.content,previous_content:old.content,created_at:new Date(old.created_at).toISOString()};}
export async function promptHistory(id:PromptId){const current=await sourcePrompt(id);const [versions,sources]=await Promise.all([promptDatabase().query('SELECT id,prompt_id,revision,parent_id,note,author,created_at FROM staging_testing_prompt_versions WHERE prompt_id=$1 ORDER BY revision DESC LIMIT 100',[id]),promptDatabase().query('SELECT id,content,created_at FROM staging_testing_prompt_sources WHERE prompt_id=$1 ORDER BY created_at DESC',[id])]);return [...versions.rows,...sources.rows.map(row=>({...current,id:row.id,content:row.content,previous_content:row.content,created_at:new Date(row.created_at).toISOString()}))];}
export async function savePrompt(raw:unknown,author:PromptAuthor){
 const edit=validatePromptEdit(raw),source=await sourcePrompt(edit.id),db=await promptDatabase().connect();
 try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['staging-prompt:'+edit.id]);const latest=(await db.query<PromptVersion>('SELECT * FROM staging_testing_prompt_versions WHERE prompt_id=$1 ORDER BY revision DESC LIMIT 1',[edit.id])).rows[0]??source;
 if(latest.id!==edit.parent)throw Error('Conflict: another user saved a newer version. Reload before saving.');if(edit.content===latest.content)throw Error('No changes to save.');
 const result=await db.query<PromptVersion>('INSERT INTO staging_testing_prompt_versions(id,prompt_id,revision,parent_id,content,previous_content,note,author) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING *',[randomUUID(),edit.id,latest.revision+1,latest.id,edit.content,latest.content,edit.note,JSON.stringify(author)]);await db.query('COMMIT');return result.rows[0];
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
export async function promptDiff(version:PromptVersion){const directory=await mkdtemp(join(tmpdir(),'prompt-diff-'));try{const before=join(directory,'before.md'),after=join(directory,'after.md');await Promise.all([writeFile(before,version.previous_content,{mode:0o600}),writeFile(after,version.content,{mode:0o600})]);try{return (await promisify(execFile)('git',['diff','--no-index','--no-ext-diff','--no-color','--',before,after],{maxBuffer:1500000})).stdout;}catch(error){const e=error as Error&{code?:number;stdout?:string};if(e.code===1)return (e.stdout??'').replaceAll(directory,'');throw error;}}finally{await rm(directory,{recursive:true,force:true});}}
const runFields='id,mode,campaign,period,language,status,stage,versions,input_hash,baseline_id,result,error,created_at,updated_at,author';
export async function readPromptRuns(id?:string){return (await promptDatabase().query<PromptRun>(`SELECT ${runFields} FROM staging_testing_prompt_runs ${id?'WHERE id=$1':'ORDER BY created_at DESC LIMIT 30'}`,id?[id]:[])).rows;}
export async function createPromptRun(raw:unknown,author:PromptAuthor,capture:(input:ReturnType<typeof validatePromptRun>)=>Promise<unknown>){
 const input=validatePromptRun(raw),versions:Record<string,PromptVersion>={};for(const id of [...new Set(['master',input.channel,'manual','readability',input.prompt,...(input.channel==='overview'?['google-search','google-pmax','google-demand-gen','meta','reddit','edm']:[])])] as PromptId[])versions[id]=await promptVersion(id,input.versions[id]);
 let frozen:unknown;
 if(input.baseline){const baseline=(await promptDatabase().query('SELECT frozen_input,result,period,campaign,language,versions FROM staging_testing_prompt_runs WHERE id=$1 AND mode=$2 AND status=$3',[input.baseline,'analysis','completed'])).rows[0];if(!baseline||baseline.period.start!==input.start||baseline.period.end!==input.end||baseline.campaign!==input.campaign||baseline.language!==input.language||(baseline.period.channel??'google-search')!==input.channel||(input.comparison&&JSON.stringify(baseline.frozen_input.comparison)!==JSON.stringify(input.comparison)))throw Error('Choose a completed analysis with matching Campaign, dates and language.');frozen=input.mode==='readability'?{...baseline.frozen_input,completed_analysis:baseline.result}:baseline.frozen_input;if(input.mode==='readability')for(const [id,version] of Object.entries(baseline.versions))if(id!=='readability')versions[id]=version as PromptVersion;}
 else frozen=await capture(input);
 const hash=createHash('sha256').update(JSON.stringify({input:frozen,versions,mode:input.mode,language:input.language,campaign:input.campaign,period:{start:input.start,end:input.end}})).digest('hex'),db=await promptDatabase().connect();
 try{await db.query('BEGIN');await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',['staging-prompt-run:'+author.sub]);const existing=(await db.query<PromptRun>(`SELECT ${runFields} FROM staging_testing_prompt_runs WHERE input_hash=$1 AND status IN ('queued','running') AND author->>'sub'=$2 LIMIT 1`,[hash,author.sub])).rows[0];if(existing){await db.query('COMMIT');return existing;}
 const count=await db.query("SELECT count(*) FROM staging_testing_prompt_runs WHERE status IN ('queued','running') AND author->>'sub'=$1",[author.sub]);if(Number(count.rows[0].count)>=3)throw Error('Please wait for your existing previews to finish.');
 const result=await db.query<PromptRun>(`INSERT INTO staging_testing_prompt_runs(id,mode,campaign,period,language,versions,frozen_input,input_hash,baseline_id,author) VALUES($1,$2,$3,$4::jsonb,$5,$6::jsonb,$7::jsonb,$8,$9,$10::jsonb) RETURNING ${runFields}`,[randomUUID(),input.mode,input.campaign,JSON.stringify({start:input.start,end:input.end,channel:input.channel,prompt:input.prompt}),input.language,JSON.stringify(versions),JSON.stringify(frozen),hash,input.baseline,JSON.stringify(author)]);await db.query('COMMIT');return result.rows[0];
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
