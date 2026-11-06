import 'server-only';
import {mkdir,readFile,writeFile,rename,rm} from 'node:fs/promises';
import path from 'node:path';
import {temporaryCacheAlive,temporaryCacheKey} from './testing-temporary-cache';
type Period={kind:string;start:string;end:string;compareStart:string;compareEnd:string};
type TemporaryJob={id:string;environment:string;author:string;scope:string;campaign:string;period:Period;status:'queued'|'running'|'completed'|'failed';createdAt:number;payload:unknown;result?:unknown;error?:string};
export function temporaryJobDirectory(environment:string,id:string){if(!['staging','production'].includes(environment)||!/^[a-f0-9-]{36}$/.test(id))throw Error('Invalid temporary report');return path.join(process.cwd(),'.state/content-testing-temporary',environment,id);}
export async function readTemporaryJob(environment:string,id:string,author:string){try{const job=JSON.parse(await readFile(path.join(temporaryJobDirectory(environment,id),'job.json'),'utf8')) as TemporaryJob;if(job.author!==author)return null;if(!temporaryCacheAlive(job.createdAt)){await rm(temporaryJobDirectory(environment,id),{recursive:true,force:true});return null;}return job;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}}
export async function enqueueTemporaryJob(environment:string,author:string,scope:string,campaign:string,language:'en'|'zh',promptRevision:string,period:Period,payload:unknown){
 const id=temporaryCacheKey({environment,author,scope,campaign,language,promptRevision,start:period.start,end:period.end,compareStart:period.compareStart,compareEnd:period.compareEnd});
 const dir=temporaryJobDirectory(environment,id);await mkdir(dir,{recursive:true,mode:0o700});const lock=path.join(dir,'enqueue-lock');
 let held=false;for(let attempt=0;attempt<100;attempt++){try{await mkdir(lock,{mode:0o700});held=true;break;}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;await new Promise(resolve=>setTimeout(resolve,20));}}
 if(!held)throw Error('Temporary report is being prepared; retry shortly.');
 try{const existing=await readTemporaryJob(environment,id,author);if(existing&&existing.status!=='failed')return {id,status:existing.status,existing:true};
  await mkdir(dir,{recursive:true,mode:0o700});const job:TemporaryJob={id,environment,author,scope,campaign,period,status:'queued',createdAt:Date.now(),payload};
  const temp=path.join(dir,`job-${process.pid}.tmp`);await writeFile(temp,JSON.stringify(job),{mode:0o600});await rename(temp,path.join(dir,'job.json'));return {id,status:'queued',existing:false};
 }finally{await rm(lock,{recursive:true,force:true});}
}
