import {readFile} from 'node:fs/promises';import path from 'node:path';
import {currentSiteUser} from '@/lib/current-site-user';
import {readTemporaryJob,temporaryJobDirectory} from '@/lib/testing-temporary-reports.server';
export async function GET(_request:Request,{params}:{params:Promise<{run:string;key:string}>}){
 const user=await currentSiteUser();if(!user)return new Response(null,{status:401});
 const {run,key}=await params;if(!/^[a-f0-9-]{36}$/.test(run)||!/^[a-zA-Z0-9-]{1,100}$/.test(key))return new Response(null,{status:404});
 const environment=process.env.DEPLOYMENT_ENV==='staging'?'staging':'production';
 const job=await readTemporaryJob(environment,run,user.sub) as {status:string;createdAt:number;media?:Record<string,string>}|null;
 const file=job?.status==='completed'?job.media?.[key]:null;if(!file||file!==`${key}.webp`)return new Response(null,{status:404});
 const maxAge=Math.max(0,Math.min(3600,Math.floor((job!.createdAt+86400000-Date.now())/1000)));
 try{return new Response(await readFile(path.join(temporaryJobDirectory(environment,run),'media',file)),{headers:{'Content-Type':'image/webp','Cache-Control':`private, max-age=${maxAge}`,'X-Content-Type-Options':'nosniff'}});}catch{return new Response(null,{status:404});}
}
