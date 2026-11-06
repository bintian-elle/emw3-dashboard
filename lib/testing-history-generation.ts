import {testingHistoryPeriod} from './testing-navigation.ts';
export const historyGenerationScopes=['overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media'] as const;
export type HistoryGenerationScope=typeof historyGenerationScopes[number];
const format=(date:Date)=>date.toISOString().slice(0,10);
export function historyGenerationRequest(value:unknown,latest:string){
 const v=value as {scope?:string;frequency?:string;start?:string;end?:string;compareStart?:string;compareEnd?:string}|null;
 if(!v||!historyGenerationScopes.includes(v.scope as HistoryGenerationScope)||!v.start||!v.end||v.end>latest)throw Error('Invalid report selection');
 const candidates=v.frequency==='auto'?['daily','weekly','monthly','custom']:[v.frequency??''];
 const frequency=candidates.find(f=>f!=='custom'&&testingHistoryPeriod(new URLSearchParams({period:'custom',history:f,start:v.start!,end:v.end!})))??(candidates.includes('custom')?'custom':v.frequency??'');
 const params=new URLSearchParams({period:'custom',history:frequency,start:v.start,end:v.end});
 let period: {frequency:'daily'|'weekly'|'monthly'|'custom';start:string;end:string}|null=testingHistoryPeriod(params);
 if(frequency==='custom'){const valid=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;if(valid(v.start)&&valid(v.end)&&v.start<=v.end)period={frequency:'custom',start:v.start,end:v.end};}
 if(!period)throw Error('Invalid report period');
 const start=new Date(`${period.start}T00:00:00Z`),end=new Date(`${period.end}T00:00:00Z`);
 let compareStart:string,compareEnd:string;
 if(period.frequency==='monthly'){
  compareStart=format(new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()-1,1)));
  compareEnd=format(new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),0)));
 }else{
  const duration=end.getTime()-start.getTime()+86400000;
  compareStart=format(new Date(start.getTime()-duration));compareEnd=format(new Date(start.getTime()-86400000));
 }
 if(v.compareStart!==undefined||v.compareEnd!==undefined){const valid=(date:unknown):date is string=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;if(!valid(v.compareStart)||!valid(v.compareEnd)||v.compareStart>v.compareEnd||v.compareEnd>latest)throw Error('Invalid comparison period');compareStart=v.compareStart;compareEnd=v.compareEnd;}
 return {scope:v.scope as HistoryGenerationScope,kind:period.frequency,start:period.start,end:period.end,compareStart,compareEnd};
}
