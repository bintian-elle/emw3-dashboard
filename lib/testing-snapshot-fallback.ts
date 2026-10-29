/** Retain the last successful snapshot if the shared database is temporarily unavailable. */
export async function readLatestWithFallback<T extends {updatedAt:string}>(
 key:string,
 latest:Map<string,T|null>,
 existing:()=>T[],
 read:()=>Promise<T|null>,
):Promise<T|null>{
 try{
  const snapshot=await read();
  // A successful empty result is authoritative and must not revive an old snapshot.
  latest.set(key,snapshot);
  return snapshot;
 }catch{
  const cached=latest.get(key);
  if(latest.has(key)&&cached===null)return null;
  const candidates=[...(cached?[cached]:[]),...existing()];
  return candidates.reduce<T|null>((newest,candidate)=>!newest||Date.parse(candidate.updatedAt)>Date.parse(newest.updatedAt)?candidate:newest,null);
 }
}
