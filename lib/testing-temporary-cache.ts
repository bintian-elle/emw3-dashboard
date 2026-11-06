import {createHash} from 'node:crypto';
export const TEMPORARY_REPORT_TTL_MS=24*60*60*1000;
export function temporaryCacheAlive(created:number,now=Date.now()){return Number.isFinite(created)&&now>=created&&now-created<TEMPORARY_REPORT_TTL_MS;}
export function temporaryCacheKey(value:{environment:string;author:string;scope:string;campaign:string;start:string;end:string;compareStart:string;compareEnd:string;language?:string;promptRevision?:string}){
 const digest=createHash('sha256').update(JSON.stringify([value.environment,value.author,value.scope,value.campaign,value.start,value.end,value.compareStart,value.compareEnd,value.language??'en',value.promptRevision??''])).digest('hex').slice(0,32);
 return `${digest.slice(0,8)}-${digest.slice(8,12)}-${digest.slice(12,16)}-${digest.slice(16,20)}-${digest.slice(20)}`;
}
