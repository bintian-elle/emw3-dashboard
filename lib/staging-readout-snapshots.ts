import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {testingReadoutContent} from './testing-readout-content.ts';
import type {TestingReadoutCacheRecord} from './ai-job-queue';
export type StagingReadoutBundle={version:1;capturedAt:string;records:Array<{source:TestingReadoutCacheRecord;translation?:{sourceHash:string;payload:unknown}}>};
const bundles=new Map<string,Promise<StagingReadoutBundle>>();
function readBundle(file:string){
 const cached=bundles.get(file);if(cached)return cached;
 const pending=readFile(file,'utf8').then(raw=>{const value=JSON.parse(raw) as StagingReadoutBundle;if(value.version!==1||!Array.isArray(value.records))throw Error('Invalid staging readout bundle');return value;});
 if(bundles.size>=2)bundles.delete(bundles.keys().next().value!);
 bundles.set(file,pending);void pending.catch(()=>bundles.delete(file));return pending;
}
/** Read a local, published bilingual mirror. Never access or mutate the shared DB. */
export async function readStagingReadoutSnapshot(directory:string,keys:readonly string[],language:'en'|'zh'):Promise<TestingReadoutCacheRecord[]|null>{
 let pointer:{snapshot?:string};
 try{pointer=JSON.parse(await readFile(join(directory,'active.json'),'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 if(typeof pointer.snapshot!=='string'||!/^[-a-z0-9]{1,80}$/.test(pointer.snapshot))throw Error('Invalid staging readout snapshot');
 const bundle=await readBundle(join(directory,pointer.snapshot,'published.json'));
 return keys.flatMap(key=>{
  const item=bundle.records.find(item=>item.source.cache_key===key);if(!item)return [];
  const payload=testingReadoutContent(key,item.source.payload),source={...item.source,payload};
  if(language==='en')return [source];
  const hash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  return [{...source,payload:item.translation?.sourceHash===hash?item.translation.payload:{...(payload as Record<string,unknown>),_translation_pending:true}}];
 });
}
export function localStagingReadoutDirectory(environment=process.env){return environment.NODE_ENV==='development'&&environment.DEPLOYMENT_ENV==='staging'?join(process.cwd(),'.state/staging-ai-readouts'):null;}
