type Store=Pick<Storage,'getItem'|'setItem'> & Partial<Pick<Storage,'key'|'length'>>;
type Entry={checked:number;value:unknown;empty?:boolean};
/** Account-isolated bilingual cache. Failed/pending reads never replace saved results. */
export function createInsightCache(storage:Store,load:(url:string)=>Promise<unknown>,now=Date.now){
 const memory=new Map<string,Entry>(),pending=new Map<string,Promise<unknown>>();
 const window=()=>Math.floor((now()-12.5*3600000)/86400000);
 function normalize(raw:string,language?:string){const url=new URL(raw,'http://local.invalid');url.searchParams.delete('expected');if(language)url.searchParams.set('language',language);const keep=url.pathname.endsWith('/readouts')?['key','language']:['period','start','end','language'];for(const key of [...url.searchParams.keys()])if(!keep.includes(key))url.searchParams.delete(key);url.searchParams.sort();if(url.pathname.endsWith('/preview')&&!url.searchParams.has('period'))url.searchParams.set('period','lastWeek');return `${url.pathname}?${url.searchParams}`;}
 function usable(value:unknown){if(!value||typeof value!=='object')return false;const v=value as {disabled?:boolean;status?:{status?:string};records?:Array<{payload?:{_translation_pending?:boolean;_translation_error?:boolean}}>};return !v.disabled&&(!v.status?.status||v.status.status==='completed')&&(!v.records||v.records.length>0&&v.records.every(r=>!r.payload?._translation_pending&&!r.payload?._translation_error));}
 function key(url:string,owner:string){
  const parsed=new URL(url,'http://local.invalid');let range='';
  if(parsed.pathname.endsWith('/preview')&&!parsed.searchParams.has('start')){
   const today=new Date(now());today.setUTCHours(12,0,0,0);const yesterday=new Date(today.getTime()-86400000),tuesday=new Date(today.getTime()-((today.getUTCDay()+5)%7)*86400000),preset=parsed.searchParams.get('period')??'lastWeek';
   const start=preset==='mtd'?new Date(Date.UTC(yesterday.getUTCFullYear(),yesterday.getUTCMonth(),1,12)):preset==='wtd'?tuesday:new Date(tuesday.getTime()-7*86400000);
   const end=preset==='lastWeek'?new Date(tuesday.getTime()-86400000):yesterday;
   range=`:${start.toISOString().slice(0,10)}:${end.toISOString().slice(0,10)}`;
  }
  return `testing-insight:v1:${owner}:${url}${range}`;
 }
 function absent(value:unknown){if(!value||typeof value!=="object")return false;const data=value as {disabled?:boolean;records?:unknown[]};return data.disabled===true||(Array.isArray(data.records)&&data.records.length===0);}
 function registry(owner:string):string[]{try{return JSON.parse(storage.getItem(`testing-insight:empty:${owner}`)??'[]') as string[];}catch{return [];}}
 function invalidateMissing(owner:string){for(const k of registry(owner)){memory.delete(k);try{storage.setItem(k,'null');}catch{}}try{storage.setItem(`testing-insight:empty:${owner}`,'[]');}catch{}}
 function invalidatePeriod(owner:string,periodKey:string){
  const prefix=`testing-insight:v1:${owner}:`,encoded=encodeURIComponent(periodKey);
  const keys=new Set([...memory.keys()]);
  try{for(let i=0;i<(storage.length??0);i++){const k=storage.key?.(i);if(k)keys.add(k);}}catch{}
  for(const k of keys)if(k.startsWith(prefix)&&k.includes(encoded)){memory.delete(k);try{storage.setItem(k,'null');}catch{}}
 }
 function saved(url:string,owner:string){const k=key(url,owner);if(memory.has(k))return memory.get(k);try{const value=JSON.parse(storage.getItem(k)??'null') as Entry|null;if(value&&typeof value.checked==='number'&&(usable(value.value)||(value.empty&&absent(value.value)))){memory.set(k,value);return value;}}catch{/* Storage may be disabled. */}}
 function fetchOne(url:string,owner:string){const k=key(url,owner);let task=pending.get(k);if(!task){task=load(url).then(value=>{if(usable(value)||(absent(value)&&!saved(url,owner))){const empty=absent(value),entry={checked:window(),value,empty};memory.set(k,entry);try{storage.setItem(k,JSON.stringify(entry));if(empty){const keys=registry(owner);if(!keys.includes(k))storage.setItem(`testing-insight:empty:${owner}`,JSON.stringify([...keys,k]));}}catch{/* Retain in-memory results when storage is unavailable. */}}return value;}).finally(()=>pending.delete(k));pending.set(k,task);}return task;}
 async function read(raw:string,owner:string){const url=normalize(raw),entry=saved(url,owner);const other=normalize(raw,new URL(url,'http://local.invalid').searchParams.get('language')==='zh'?'en':'zh');
  const pair=()=>Promise.all([fetchOne(url,owner),fetchOne(other,owner)]);
  if(entry?.empty&&entry.checked!==window())return fetchOne(url,owner);
  if(entry){if(entry.checked!==window()){const checked={...entry,checked:window()};memory.set(key(url,owner),checked);try{storage.setItem(key(url,owner),JSON.stringify(checked));}catch{/* Optional persistence. */}void pair().catch(()=>{});}else if(!saved(other,owner))void fetchOne(other,owner).catch(()=>{});return entry.value;}
  const requested=fetchOne(url,owner);void fetchOne(other,owner).catch(()=>{});return requested;
 }
 return {read,invalidateMissing,invalidatePeriod};
}
