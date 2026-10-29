import 'server-only';
import { readConcludedLocalReadout, writeConcludedLocalReadout, readConcludedLocalTranslation, writeConcludedLocalTranslation } from './testing-concluded-local-cache';
import {readTestingReadoutCache,readTestingReadoutVersions,type TestingReadoutCacheRecord} from './ai-job-queue';
import {readoutSourceHash,translatedTestingReadouts} from './testing-readout-translation';
import {testingReadoutContent} from './testing-readout-content';
import {acceptReadoutColdResult,reconcileReadoutMemory} from './testing-readout-reconcile-model';

type CacheState={records:Map<string,TestingReadoutCacheRecord>;translations:Map<string,TestingReadoutCacheRecord>;translationVersions:Map<string,string>;pending:Map<string,Promise<TestingReadoutCacheRecord|null>>;generations:Map<string,number>;authoritative:Map<string,string|null>};
declare global{var emw3PageReadoutMemory:CacheState|undefined;}
const state=globalThis.emw3PageReadoutMemory??={records:new Map(),translations:new Map(),translationVersions:new Map(),pending:new Map(),generations:new Map(),authoritative:new Map()};
// Preserve the cache safely across local hot reloads created before these fields existed.
state.generations??=new Map();state.authoritative??=new Map();
const hash=(record:TestingReadoutCacheRecord)=>readoutSourceHash(testingReadoutContent(record.cache_key,record.payload));
const translationKey=(record:TestingReadoutCacheRecord)=>`${record.cache_key}\u0000zh\u0000${hash(record)}`;
export function hasTestingPageReadouts(keys:readonly string[]){return keys.some(key=>state.records.has(key));}
function remember(record:TestingReadoutCacheRecord){
 const previous=state.records.get(record.cache_key);
 if(previous&&Date.parse(String(previous.updated_at))>Date.parse(String(record.updated_at)))return previous;
 if(state.records.size>=256&&!previous)state.records.delete(state.records.keys().next().value!);
 state.records.set(record.cache_key,record);void writeConcludedLocalReadout(record);return record;
}
async function fetchMissing(keys:string[]){
 const missing=keys.filter(key=>!state.pending.has(key));
 if(missing.length){
  const request=readTestingReadoutCache(missing);
  for(const key of missing){
   const generation=state.generations.get(key)??0;
   const pending=request.then(rows=>{const row=rows.find(item=>item.cache_key===key);return row&&acceptReadoutColdResult(generation,state.generations.get(key)??0,state.authoritative.get(key),new Date(row.updated_at).toISOString())?remember(row):state.records.get(key)??null;});
   state.pending.set(key,pending);
   void pending.finally(()=>{if(state.pending.get(key)===pending)state.pending.delete(key);}).catch(()=>{});
  }
 }
 return Promise.all(keys.map(key=>state.pending.get(key)!));
}
/** Pages reuse only published shared records; other AI callers keep their existing reads. */
export async function readTestingPageReadouts(keys:string[],language:'en'|'zh',readOnly=false){
 const initialMissing=keys.filter(key=>!state.records.has(key));
 const local=await Promise.all(initialMissing.map(readConcludedLocalReadout));
 for(const record of local)if(record)remember(record);
 const missing=keys.filter(key=>!state.records.has(key));
 if(missing.length)await fetchMissing(missing);
 const records=keys.flatMap(key=>{const record=state.records.get(key);return record?[{...record,payload:testingReadoutContent(key,record.payload)}]:[];});
 if(language==='en')return records;
 return Promise.all(records.map(async record=>{
  const key=translationKey(record),cached=state.translations.get(key);if(cached)return cached;
  const local=await readConcludedLocalTranslation(record,hash(record));if(local){state.translations.set(key,local);return local;}
  const localized=(await translatedTestingReadouts([record],readOnly))[0];
  const payload=localized?.payload as {_translation_pending?:boolean;_translation_error?:boolean}|undefined;
  if(localized&&!payload?._translation_pending&&!payload?._translation_error){if(state.translations.size>=256){const oldest=state.translations.keys().next().value!;state.translations.delete(oldest);state.translationVersions.delete(oldest);}state.translations.set(key,localized);void writeConcludedLocalTranslation(localized,hash(record));}
  return localized??record;
 }));
}

/** Compare lightweight metadata and replace warm page snapshots only after a successful read. */
async function reconcile(keys:string[],language:'en'|'zh',expected?:unknown){
 const versions=await readTestingReadoutVersions(keys,language);
 const result=await reconcileReadoutMemory(state,{
  keys,language,versions,expected,loadMissing:expected!==undefined,
  loadRecords:readTestingReadoutCache,
  sourceHash:hash,
  loadTranslation:async record=>{
   const next=(await translatedTestingReadouts([{...record,payload:testingReadoutContent(record.cache_key,record.payload)}],true))[0];
   const payload=next?.payload as {_translation_pending?:boolean;_translation_error?:boolean}|undefined;
   return !next||payload?._translation_pending||payload?._translation_error?null:next;
  },
 });
 for(const version of result)if(!state.authoritative.has(version.key)||state.authoritative.get(version.key)!==version.updatedAt){state.authoritative.set(version.key,version.updatedAt);state.generations.set(version.key,(state.generations.get(version.key)??0)+1);}
 while(state.authoritative.size>512){const oldest=[...state.authoritative.keys()].find(key=>!state.pending.has(key));if(!oldest)break;state.authoritative.delete(oldest);state.generations.delete(oldest);}
 return result;
}

/** Compare lightweight metadata; failed refreshes leave the last good data intact. */
export function reconcileTestingPageReadouts(keys:string[],language:'en'|'zh'){return reconcile(keys,language);}
/** Verify an observed version on this instance before serving it to a viewer. */
export function reconcileExpectedTestingPageReadouts(keys:string[],language:'en'|'zh',expected:unknown){return reconcile(keys,language,expected);}
