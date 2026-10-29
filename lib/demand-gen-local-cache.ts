import {createHash} from 'node:crypto';

type KeyInput={campaign:string;group?:string;preset?:string;start?:string;end?:string};

/** Do not retain connection credentials in cache keys. */
export function demandGenCacheKey(connection:string,input:KeyInput,day=new Date().toISOString().slice(0,10)):string{
 const account=createHash('sha256').update(connection).digest('hex');
 return JSON.stringify([account,input.campaign,input.group??'',input.preset??'lastWeek',input.start??'',input.end??'',day]);
}

type Entry<T>={hasValue:boolean;value?:T;load:()=>Promise<T>;accessedAt:number;pending?:Promise<T>};
type Options={now?:()=>number;retentionMs?:number;maxEntries?:number};

/** Cache complete old Demand Gen query results, keeping good data on refresh failure. */
export function createDemandGenLocalCache<T>({now=Date.now,retentionMs=300_000,maxEntries=64}:Options={}){
 const entries=new Map<string,Entry<T>>();
 const limit=Math.max(1,Math.floor(maxEntries));
 const refresh=(key:string,entry:Entry<T>):Promise<T>=>{
  if(entry.pending)return entry.pending;
  const load=entry.load;
  const pending=Promise.resolve().then(load).then(value=>{entry.value=value;entry.hasValue=true;return value;}).catch(error=>{
   if(!entry.hasValue&&entries.get(key)===entry)entries.delete(key);
   throw error;
  }).finally(()=>{entry.pending=undefined;});
  entry.pending=pending;
  return pending;
 };
 const get=(key:string,load:()=>Promise<T>):Promise<T>=>{
   let entry=entries.get(key);
   if(!entry){
    if(entries.size>=limit){
     const oldest=[...entries].filter(([,item])=>!item.pending).sort((a,b)=>a[1].accessedAt-b[1].accessedAt)[0];
     if(oldest)entries.delete(oldest[0]);
     else return Promise.race([...entries.values()].map(item=>item.pending!.catch(()=>undefined))).then(()=>get(key,load));
    }
    entry={hasValue:false,load,accessedAt:now()};entries.set(key,entry);
   } else {entry.load=load;entry.accessedAt=now();}
   return entry.hasValue?Promise.resolve(entry.value as T):refresh(key,entry);
 };
 return {
  get,
  async refreshActive():Promise<void>{
   for(const [key,entry] of entries){
    if(now()-entry.accessedAt>retentionMs)continue;
    if(entry.hasValue)try{await refresh(key,entry);}catch{/* Preserve the last successful result. */}
   }
  },
 };
}
