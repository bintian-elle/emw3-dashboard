import {parseDate} from '@internationalized/date';
import {domains} from './collect.mjs';
import {days} from './model.mjs';
const clock=now=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
export function easternDay(now=new Date()){const c=clock(now);return`${c.year}-${c.month}-${c.day}`;}
export function assertInsightCoverage(rows,now=new Date()){const today=easternDay(now);if(domains.some(domain=>!rows.some(row=>row.domain===domain&&row.end_day>=today)))throw Error('EDM daily data coverage is incomplete; saved Insights retained');}
export function resolveWindow(now=new Date(),input={}){const today=easternDay(now),end=input.end??today,start=input.start??[parseDate(end).subtract({days:14}).toString(),'2026-11-10'].sort().at(-1);days(start,end);if(end>today||start<'2026-11-10')throw Error('Only complete days after the migration baseline may be refreshed');return{start,end};}
export function dueAttempt(state,now=new Date()){const day=easternDay(now),hour=Number(clock(now).hour);if(hour<4)return false;if(state.day!==day)return true;if(state.success||state.attempts>=2)return false;return !state.lastAttempt||hour>Number(clock(new Date(state.lastAttempt)).hour);}
export async function tryPendingNotice(state,options){
 const pendingFailure=!state.success&&state.outcomes&&state.attempts>=2&&(!state.failureSentAt||Date.parse(state.failureSentAt)<Date.parse(state.lastAttempt));
 if(!(state.success&&state.pendingRecovery)&&!pendingFailure)return{state,deferred:false};
 try{return{state:await recordResult(state,state.outcomes,{...options,through:state.through,notifyFailure:!!pendingFailure}),deferred:false};}catch{return{state,deferred:true};}
}
export async function recordResult(previous,outcomes,{through,save,send,now=new Date(),notifyFailure=false,knownIncident=false}){
 const success=domains.every(d=>outcomes[d]?.ok===true),state={...previous,updatedAt:now.toISOString(),outcomes,through,success,pendingRecovery:!!previous.pendingRecovery||!success||knownIncident};await save(state);
 if(!success&&notifyFailure){const failed=domains.filter(d=>outcomes[d]?.ok!==true).map(d=>`${d}: ${outcomes[d]?.error??outcomes.setup?.error??'not completed'}`);await send(`Dashboard 定时任务失败：EDM 数据采集\n${failed.join('\n')}\n失败范围保留原数据，未将不完整结果发布为最新数据。\nhttps://emw3-dashboard.win/bluevua/edm`);state.failureSentAt=now.toISOString();await save(state);}
 if(success&&state.pendingRecovery){await send(`Dashboard 数据采集已恢复：EDM\n数据已保存至 EC2 PostgreSQL，完整更新至 ${through}。\nhttps://emw3-dashboard.win/bluevua/edm`);state.pendingRecovery=false;state.recoverySentAt=now.toISOString();await save(state);}
 return state;
}
