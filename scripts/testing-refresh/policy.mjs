export function easternClock(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {day:`${parts.year}-${parts.month}-${parts.day}`,hour:Number(parts.hour)};
}
export function dueAttempt(state,hour,startHour,now=Date.now(),mode='data'){
 const limit=mode==='data'?2:1;
 if(state.success||(state.attempts??0)>=limit||hour<startHour)return false;
 if(mode==='data'&&![4,5].includes(hour))return false;
 return !state.lastAttempt||easternClock(new Date(state.lastAttempt)).day!==easternClock(new Date(now)).day||easternClock(new Date(state.lastAttempt)).hour!==hour;
}
export function collectionPlan(){return [
 ...['meta','reddit','edm'].flatMap(channel=>['lastWeek','wtd','mtd'].map(period=>({key:`${channel}:${period}`,channel,period}))),
 {key:'reddit:sinceSep24',channel:'reddit',period:'sinceSep24'},
 {key:'social:all',channel:'social'}];}
export function safeReason(value){const detail=value instanceof Error&&value.cause?`${value.message} (${value.cause.code||value.cause.message||value.cause})`:String(value);return detail.replace(/Bearer\s+\S+/gi,'Bearer [redacted]').replace(/((?:access_token|refresh_token|client_secret|api_key|password)\s*[=:]\s*)[^\s&,"}]+/gi,'$1[redacted]').slice(0,600);}
