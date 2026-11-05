import 'server-only';
import {mkdir,readFile,readdir,writeFile,rename,copyFile} from 'node:fs/promises';
import path from 'node:path';
import type {PromptRun} from './testing-prompts-contract';
export const localPromptQueueEnabled=()=>process.env.NODE_ENV==='development'&&process.env.DEPLOYMENT_ENV==='staging';
export const localPromptRunDirectory=()=>path.join(process.cwd(),'.state/prompt-runs-local');
export async function readLocalPromptJobs():Promise<Array<PromptRun&{frozen_input:unknown}>>{
 if(!localPromptQueueEnabled())return [];let names:string[];try{names=await readdir(localPromptRunDirectory());}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return [];throw error;}
 return (await Promise.all(names.filter(name=>/^[a-f0-9-]{36}$/.test(name)).map(async name=>{try{return JSON.parse(await readFile(path.join(localPromptRunDirectory(),name,'job.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}))).filter(Boolean);
}
export function publicLocalPromptRun(job:PromptRun):PromptRun{const {id,mode,campaign,period,language,status,stage,versions,input_hash,baseline_id,result,error,created_at,updated_at,author}=job;return {id,mode,campaign,period,language,status,stage,versions,input_hash,baseline_id,result,error,created_at,updated_at,author};}
export async function saveLocalPromptJob(job:PromptRun&{frozen_input:unknown}){
 const root=path.join(localPromptRunDirectory(),job.id);await mkdir(root,{recursive:true,mode:0o700});const frozen=job.frozen_input as {media_directory?:string;media_index?:Array<{file:string}>};if(frozen.media_directory&&frozen.media_index?.length){const source=path.join(root,'source-media');await mkdir(source,{recursive:true});for(const media of frozen.media_index){if(!/^[-\w]+\.webp$/.test(media.file))throw Error('Invalid registered media file');await copyFile(path.join(frozen.media_directory,media.file),path.join(source,media.file));}frozen.media_directory=source;}const temp=path.join(root,'job.tmp');await writeFile(temp,JSON.stringify(job),{mode:0o600});await rename(temp,path.join(root,'job.json'));return publicLocalPromptRun(job);
}
