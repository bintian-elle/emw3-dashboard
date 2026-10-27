import type {ContentTestingSnapshot} from './ai-dashboard-content-testing.ts';
import {dashboardProject} from './ai-dashboard-project.ts';
import type {ProjectId} from './ai-dashboard-options.ts';
import type {TextBlock} from './ai-dashboard-text.ts';
import {validateEditorContext,validateRecentConversation} from './ai-dashboard-actions.ts';
import type {EditorContext} from './ai-dashboard-editor.ts';
import type {ChartColors} from './ai-dashboard-colors.ts';
import {loadDashboardPreview} from './ai-dashboard-preview.ts';
import {mkdir,readFile,writeFile,rename,rm,readdir,stat} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {canReadJob,validateReport,validateRange,resolveRequestedRange,type DashboardReport,type ReportSpec} from './ai-dashboard.ts';
export type DashboardJob={contentTesting?:ContentTestingSnapshot;project?:ProjectId;id:string;owner:string;prompt:string;status:'queued'|'running'|'completed'|'failed';stage:string;createdAt:string;updatedAt:string;parent:ReportSpec|null;result:DashboardReport|null;error:string|null;editor?:EditorContext;answer?:string;edit?:{changed:boolean;order:string[];hidden:string[];colors:ChartColors;baseRevision:number;texts?:TextBlock[]};elapsedMs?:number;conversation?:Array<{role:'user'|'assistant';text:string}>};
export function jobsDirectory(){return path.join(process.cwd(),'.state','ai-dashboard','jobs');}
export function ownerLock(owner:string){return path.join(jobsDirectory(),'.owner-'+createHash('sha256').update(owner).digest('hex'));}
export function jobFile(id:string){if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Task not found.');return path.join(jobsDirectory(),id,'job.json');}
export async function saveJob(job:DashboardJob){job.updatedAt=new Date().toISOString();const target=jobFile(job.id);await mkdir(path.dirname(target),{recursive:true});const temporary=target+'.'+randomUUID()+'.tmp';await writeFile(temporary,JSON.stringify(job),{mode:0o600});await rename(temporary,target);}
export async function getJob(id:string,owner:string){const job=JSON.parse(await readFile(jobFile(id),'utf8')) as DashboardJob;if(!canReadJob(job,owner))throw Error('Task not found.');if(['queued','running'].includes(job.status)&&Date.now()-Date.parse(job.updatedAt)>300000){job.status='failed';job.error='Task timed out. Please retry.';job.stage='Failed';await saveJob(job);await rm(ownerLock(owner),{recursive:true,force:true});}return job;}
export function publicJob(job:DashboardJob){const {id,prompt,status,stage,createdAt,updatedAt,result,error,answer,edit,elapsedMs}=job;return{id,prompt,status,stage,createdAt,updatedAt,result,error,answer,edit,elapsedMs};}
export async function createJob(prompt:unknown,owner:string,parentId?:unknown,context?:unknown,conversation?:unknown,contentTesting?:ContentTestingSnapshot){
 if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000)throw Error('Enter a question of 1–2000 characters.');
 const recent=validateRecentConversation(conversation);
 const requested=resolveRequestedRange(prompt);if(requested)validateRange(requested.start,requested.end);
 let parent:ReportSpec|null=null;
 if(parentId){if(typeof parentId!=='string')throw Error('Invalid parent task.');const previous=await getJob(parentId,owner);if((previous.project||'bluevua')!==dashboardProject())throw Error('Previous report belongs to another project.');if(!previous.result||previous.status!=='completed')throw Error('Previous report is not ready.');const {title,summary,range,widgets}=previous.result;parent=validateReport({title,summary,range,widgets:widgets.map(({id,title,kind,source,groupBy,metrics,sortBy})=>({id,title,kind,source,groupBy,metrics,sortBy}))});}
 let base:EditorContext;if(context)base=validateEditorContext(context);else{const previous=parent||await loadDashboardPreview();const spec={title:previous.title,summary:previous.summary,range:previous.range,widgets:previous.widgets.map(({id,title,kind,source,groupBy,metrics,sortBy})=>({id,title,kind,source,groupBy,metrics,sortBy}))};base=validateEditorContext({report:spec,order:spec.widgets.map(w=>w.id),hidden:[],colors:{},revision:0});}
 await mkdir(jobsDirectory(),{recursive:true});const lock=ownerLock(owner);
 try{await mkdir(lock);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;const info=await stat(lock);if(Date.now()-info.mtimeMs<300000)throw Error('A report is already running. Wait for it to finish.');await rm(lock,{recursive:true,force:true});await mkdir(lock);}
 try{
  const entries=await readdir(jobsDirectory());let active=0;for(const id of entries.filter(id=>/^[0-9a-f-]{36}$/.test(id))){const data=JSON.parse(await readFile(jobFile(id),'utf8')) as DashboardJob;if(['queued','running'].includes(data.status)&&Date.now()-Date.parse(data.updatedAt)<300000)active++;}if(active>=4)throw Error('Report queue is busy. Please retry shortly.');
  const now=new Date().toISOString();const job:DashboardJob={...(contentTesting&&dashboardProject()==='bluevua'?{contentTesting}:{}),project:dashboardProject(),id:randomUUID(),owner,prompt:prompt.trim(),status:'queued',stage:'Queued',createdAt:now,updatedAt:now,parent:base.report,editor:base,conversation:recent,result:null,error:null};await saveJob(job);
  const child=spawn(process.execPath,['--experimental-strip-types',path.join(process.cwd(),'scripts','ai-dashboard-worker.ts'),job.id],{cwd:process.cwd(),detached:true,stdio:'ignore',env:process.env});
  child.on('error',async()=>{job.status='failed';job.stage='Failed';job.error='Could not start the local Codex worker.';await saveJob(job);await rm(lock,{recursive:true,force:true});});child.unref();return job;
 }catch(error){await rm(lock,{recursive:true,force:true});throw error;}
}
