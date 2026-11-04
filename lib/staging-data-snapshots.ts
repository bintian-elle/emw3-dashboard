import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
export function stagingSnapshotFile(channel:string,scope:string){return createHash('sha256').update(JSON.stringify([channel,scope])).digest('hex')+'.json';}
export async function readStagingDataSnapshot<T=unknown>(directory:string,channel:string,scope:string,latest=false):Promise<{payload:T;updatedAt:string}|null>{
 let raw:string;
 try{raw=await readFile(join(directory,stagingSnapshotFile(channel,scope)),'utf8');}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return null;throw error;}
 const value=JSON.parse(raw);
 if(value.channel!==channel||(!latest&&value.scope!==scope)||!value.payload||typeof value.updatedAt!=='string'||!Number.isFinite(Date.parse(value.updatedAt)))throw Error('Invalid staging report snapshot');
 return {payload:value.payload as T,updatedAt:value.updatedAt};
}
export async function requireStagingDataSnapshot<T=unknown>(directory:string,channel:string,scope:string,latest=false){
 const snapshot=await readStagingDataSnapshot<T>(directory,channel,scope,latest);
 if(!snapshot)throw Error('This reporting period is not available in this staging snapshot. Choose a published reporting period.');
 return snapshot;
}
