/** Pure, dependency-injected reconciliation for published page readouts. */
export type ReadoutVersion={key:string;updatedAt:string|null;translationAt:string|null;sourceHash:string|null};
type RecordBase={cache_key:string;updated_at:string|Date};
export type ReadoutMemory<T extends RecordBase>={records:Map<string,T>;translations:Map<string,T>;translationVersions:Map<string,string>};

/** A cold read started before a metadata check cannot restore a deleted/stale row. */
export function acceptReadoutColdResult(startGeneration:number,currentGeneration:number,knownVersion:string|null|undefined,resultVersion:string):boolean{
 if(startGeneration===currentGeneration)return true;
 return typeof knownVersion==='string'&&Date.parse(knownVersion)===Date.parse(resultVersion);
}

/** Check only requested keys; callers may carry other keys from a batched poll. */
export function expectedReadoutVersionsMatch(keys:readonly string[],language:'en'|'zh',actual:readonly ReadoutVersion[],expected:unknown):boolean{
 if(!Array.isArray(expected)||expected.length>8||actual.length!==keys.length)return false;
 const seen=new Set<string>();
 for(const item of expected){
  if(!item||typeof item!=='object'||typeof item.key!=='string'||seen.has(item.key))return false;
  seen.add(item.key);
  for(const field of ['updatedAt','translationAt','sourceHash'])if(item[field]!==null&&typeof item[field]!=='string')return false;
 }
 return keys.every((key,index)=>{
  const value=actual[index],wanted=expected.find(item=>item.key===key);
  return value?.key===key&&wanted&&value.updatedAt===wanted.updatedAt&&(language==='en'||(value.translationAt===wanted.translationAt&&value.sourceHash===wanted.sourceHash));
 });
}

export async function reconcileReadoutMemory<T extends RecordBase>(
 state:ReadoutMemory<T>,options:{keys:readonly string[];language:'en'|'zh';versions:readonly ReadoutVersion[];expected?:unknown;loadMissing?:boolean;loadRecords:(keys:string[])=>Promise<T[]>;loadTranslation:(record:T)=>Promise<T|null>;sourceHash:(record:T)=>string},
){
 const {keys,language,versions}=options;
 if(versions.length!==keys.length||keys.some((key,index)=>versions[index]?.key!==key))throw Error('Invalid readout metadata.');
 if(options.expected!==undefined&&!expectedReadoutVersionsMatch(keys,language,versions,options.expected))throw Error('Readout version changed.');
 const before=new Map(keys.map(key=>[key,state.records.get(key)]));
 const translationBefore=new Map([...state.translations].filter(([key])=>keys.some(id=>key.startsWith(`${id}\u0000`))));
 const translationVersionsBefore=new Map([...state.translationVersions].filter(([key])=>keys.some(id=>key.startsWith(`${id}\u0000`))));
 const loads=versions.filter(version=>{
  const record=before.get(version.key);
  return Boolean(version.updatedAt&&(record?new Date(record.updated_at).toISOString()!==version.updatedAt:options.loadMissing));
 }).map(version=>version.key);
 const fetched=loads.length?await options.loadRecords(loads):[];
 const nextRecords=new Map<string,T|null>();
 for(const version of versions){
  const existing=before.get(version.key);
  if(version.updatedAt===null){nextRecords.set(version.key,null);continue;}
  if(!loads.includes(version.key)){nextRecords.set(version.key,existing??null);continue;}
  const record=fetched.find(item=>item.cache_key===version.key);
  if(!record||new Date(record.updated_at).toISOString()!==version.updatedAt)throw Error('Published readout unavailable.');
  nextRecords.set(version.key,record);
 }
 const translationsToSave=new Map<string,{record:T;version:string}>();
 const translationKeysToKeep=new Map<string,string>();
 if(language==='zh')for(const version of versions){
  const record=nextRecords.get(version.key);
  if(!record||!version.translationAt||version.sourceHash!==options.sourceHash(record))continue;
  const key=`${version.key}\u0000zh\u0000${version.sourceHash}`;
  translationKeysToKeep.set(version.key,key);
  const cached=state.translations.get(key);
  if(!cached&&!options.loadMissing)continue;
  if(cached&&state.translationVersions.get(key)===version.translationAt)continue;
  const translated=await options.loadTranslation(record);
  if(!translated)throw Error('Published translation unavailable.');
  translationsToSave.set(key,{record:translated,version:version.translationAt});
 }
 // Other requests may publish while I/O is pending. Never overwrite their data.
 for(const key of keys)if(state.records.get(key)!==before.get(key))throw Error('Readout cache changed during reconciliation.');
 for(const [key,value] of translationBefore)if(state.translations.get(key)!==value)throw Error('Translation cache changed during reconciliation.');
 for(const [key,value] of state.translations)if(keys.some(id=>key.startsWith(`${id}\u0000`))&&translationBefore.get(key)!==value)throw Error('Translation cache changed during reconciliation.');
 for(const [key,value] of translationVersionsBefore)if(state.translationVersions.get(key)!==value)throw Error('Translation version changed during reconciliation.');
 for(const [key,value] of state.translationVersions)if(keys.some(id=>key.startsWith(`${id}\u0000`))&&translationVersionsBefore.get(key)!==value)throw Error('Translation version changed during reconciliation.');
 for(const [key,record] of nextRecords){if(record)state.records.set(key,record);else state.records.delete(key);}
 for(const [key,value] of translationBefore){
  const id=keys.find(candidate=>key.startsWith(`${candidate}\u0000`));
  const record=id?nextRecords.get(id):null;
  const keep=id&&record?(language==='zh'?translationKeysToKeep.get(id):`${id}\u0000zh\u0000${options.sourceHash(record)}`):undefined;
  if(id&&key!==keep&&state.translations.get(key)===value){state.translations.delete(key);state.translationVersions.delete(key);}
 }
 if(language==='zh'){
  for(const [key,value] of translationsToSave){state.translations.set(key,value.record);state.translationVersions.set(key,value.version);}
 }
 while(state.records.size>256){const oldest=state.records.keys().next().value;if(oldest===undefined)break;state.records.delete(oldest);}
 while(state.translations.size>256){const oldest=state.translations.keys().next().value;if(oldest===undefined)break;state.translations.delete(oldest);state.translationVersions.delete(oldest);}
 return versions;
}
