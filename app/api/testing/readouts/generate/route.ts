import {currentSiteUser} from '@/lib/current-site-user';
import {testingPeriodLabels,type TestingPeriodPreset} from '@/lib/testing-google';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import {refreshTestingReadouts} from '@/lib/testing-readout-refresh';
import {manualTestingScope} from '@/lib/testing-manual-scope';
import {invalidatePublishedTestingPageReadouts} from '@/lib/testing-readout-page-cache';

export async function POST(request:Request){
 if(!await currentSiteUser())return Response.json({error:'Unauthorized'},{status:401});
 const value=await request.json().catch(()=>null) as {label?:unknown;start?:unknown;end?:unknown;retry?:unknown;scope?:unknown}|null;
 const preset=(Object.entries(testingPeriodLabels) as Array<[TestingPeriodPreset,string]>).find(([,label])=>label===value?.label)?.[0];
 const valid=(date:unknown):date is string=>typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(`${date}T00:00:00Z`))&&new Date(`${date}T00:00:00Z`).toISOString().slice(0,10)===date;
 const scope=typeof value?.scope==='string'?manualTestingScope(value.scope):null;
 if(!scope||!preset||!valid(value?.start)||!valid(value?.end)||value.start>value.end||value.end>testingLatestCompleteDate())return Response.json({error:'Invalid reporting period.'},{status:400});
 const resolved=resolveTestingPeriod(testingLatestCompleteDate(),{preset,start:value.start,end:value.end});
 if(resolved.start!==value.start||resolved.end!==value.end)return Response.json({error:'Reporting period has changed. Please select it again.'},{status:400});
 try{
  // A custom input preserves the displayed dates while retaining the period label.
  const result=await refreshTestingReadouts({preset,start:value.start,end:value.end,manualScope:scope},value.retry===true);
  if(!result.pending)invalidatePublishedTestingPageReadouts();
  return Response.json(result,{status:result.pending?202:200,headers:{'Cache-Control':'private, no-store'}});
 }catch{return Response.json({error:'Unable to generate analysis. Please try again later.'},{status:503});}
}
