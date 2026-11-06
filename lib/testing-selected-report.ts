import {testingHistoryPeriod} from './testing-navigation.ts';
export function selectedReportPeriod(params:URLSearchParams){
 const history=testingHistoryPeriod(params);if(history)return history;
 const start=params.get('start'),end=params.get('end');
 if(params.get('period')!=='custom'||params.has('history')||!start||!end)return null;
 for(const frequency of ['daily','weekly','monthly']){const candidate=testingHistoryPeriod(new URLSearchParams({period:'custom',history:frequency,start,end}));if(candidate)return candidate;}
 if(start!==end||!/^\d{4}-\d{2}-\d{2}$/.test(start))return null;
 const date=new Date(`${start}T00:00:00Z`);if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==start)return null;
 return {frequency:'daily' as const,start,end};
}
