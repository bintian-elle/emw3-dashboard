import {readFile,writeFile,rename,rm} from 'node:fs/promises';
import {homedir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
/** Reuse this host's upstream model metadata, without copying account identity or changing global settings. */
export async function dashboardCodexCatalog(directory:string,cacheFile=path.join(process.env.CODEX_HOME||path.join(homedir(),'.codex'),'models_cache.json')):Promise<string|null>{
 let temporary:string|undefined;
 try{
  const raw=await readFile(cacheFile,'utf8');if(raw.length>2_000_000)return null;
  const cached=JSON.parse(raw);if(!Array.isArray(cached.models)||!cached.models.length||cached.models.some((model:unknown)=>!model||typeof model!=='object'||typeof (model as {slug?:unknown}).slug!=='string'))return null;
  const target=path.join(directory,'codex-model-catalog.json');temporary=target+'.'+randomUUID()+'.tmp';
  await writeFile(temporary,JSON.stringify({models:cached.models}),{mode:0o600});await rename(temporary,target);return target;
 }catch{return null;}finally{if(temporary)await rm(temporary,{force:true}).catch(()=>{});}
}
