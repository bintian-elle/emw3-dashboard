/** A process-local, bounded snapshot cache; versions are shared-database timestamps. */
export class VersionedSnapshotMemory<T extends {updatedAt:string}> {
 private readonly entries=new Map<string,T>();
 private readonly pending=new Map<string,Promise<T|null>>();
 private readonly limit:number;
 constructor(limit=256) {this.limit=limit;}

 get(key:string){return this.entries.get(key);}
 keys(){return [...this.entries.keys()];}
 set(key:string,value:T){
  const previous=this.entries.get(key);
  if(previous&&Date.parse(previous.updatedAt)>=Date.parse(value.updatedAt))return previous;
  this.entries.delete(key);
  if(this.entries.size>=this.limit)this.entries.delete(this.entries.keys().next().value!);
  this.entries.set(key,value);return value;
 }
 delete(key:string){this.entries.delete(key);}

 /** A miss waits for the database; concurrent misses share the same request. */
 async read(key:string,load:()=>Promise<T|null>):Promise<T|null>{
  const cached=this.entries.get(key);return cached??this.load(key,load);
 }

 /** Explicit refresh still shares an in-flight load with other callers. */
 fetch(key:string,load:()=>Promise<T|null>):Promise<T|null>{return this.load(key,load);}

 private load(key:string,load:()=>Promise<T|null>,allowOlder=false):Promise<T|null>{
  const existing=this.pending.get(key);if(existing)return existing;
  const before=this.entries.get(key);
  const request=(async()=>{
   const value=await load();
   if(value){
    // A confirmed database rollback may make an older snapshot authoritative.
    // Never let that result replace a newer local publication made in flight.
    if(allowOlder&&before&&this.entries.get(key)===before){this.entries.set(key,value);return value;}
    return this.set(key,value);
   }
   // A confirmed deletion is authoritative, but never erase a newer publication.
   if(this.entries.get(key)===before)this.entries.delete(key);
   return this.entries.get(key)??null;
  })();
  this.pending.set(key,request);
  void request.finally(()=>{if(this.pending.get(key)===request)this.pending.delete(key);}).catch(()=>{});
  return request;
 }

 /** Refresh only when the shared version changes; failed reads retain old data. */
 async reconcile(key:string,version:string|null,load:()=>Promise<T|null>):Promise<void>{
  const current=this.entries.get(key);if(!current)return;
  if(version===null){if(this.entries.get(key)===current)this.entries.delete(key);return;}
  if(Date.parse(version)===Date.parse(current.updatedAt))return;
  try{await this.load(key,load,Date.parse(version)<Date.parse(current.updatedAt));}catch{/* Keep the last successful snapshot. */}
 }
}
