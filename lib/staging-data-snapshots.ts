import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export function stagingSnapshotFile(channel:string,scope:string){return createHash('sha256').update(JSON.stringify([channel,scope])).digest('hex')+'.json';}
export async function readStagingDataSnapshot<T=unknown>(directory:string,channel:string,scope:string,latest=false):Promise<{payload:T;updatedAt:string}|null>{
 let raw:string;
 try{raw=await readFile(join(directory,stagingSnapshotFile(channel,scope)),'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 const value=JSON.parse(raw);
 if(value.channel!==channel||(!latest&&value.scope!==scope)||!value.payload||typeof value.updatedAt!=='string'||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('Invalid staging report snapshot');
 return {payload:(channel==='reddit'?clipStagingRedditDaily(value.payload):value.payload) as T,updatedAt:value.updatedAt};
}
export async function requireStagingDataSnapshot<T=unknown>(directory:string,channel:string,scope:string,latest=false){
 const snapshot=await readStagingDataSnapshot<T>(directory,channel,scope,latest);
 if(!snapshot)throw Error('This reporting period is not available in this staging snapshot. Choose a published reporting period.');
 return snapshot;
}
/** Some published Reddit caches contain the API's inclusive extra end day.
 * Keep the recorded totals intact and show daily points only in their period. */
export function clipStagingRedditDaily(value:unknown):unknown{
 const payload=value as {data?:{period?:{start?:string;end?:string}};daily?:{rows?:unknown[];reach?:unknown[]}}|null;
 const start=payload?.data?.period?.start,end=payload?.data?.period?.end,daily=payload?.daily;
 if(!start||!end||!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||start>end||!Array.isArray(daily?.rows)||!Array.isArray(daily?.reach))return value;
 const keep=(row:unknown)=>{const date=(row as {date?:unknown}|null)?.date;return typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>=start&&date<=end;};
 const rows=daily.rows.filter(keep),reach=daily.reach.filter(keep);
 return rows.length===daily.rows.length&&reach.length===daily.reach.length?value:{...payload,daily:{...daily,rows,reach}};
}
