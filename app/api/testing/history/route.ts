import {NextResponse} from 'next/server';
import {parseDate} from '@internationalized/date';
import {currentSiteUser} from '@/lib/current-site-user';
import {readTestingReadoutsForDates} from '@/lib/ai-job-queue';
import {translatedTestingReadouts} from '@/lib/testing-readout-translation';
import {matchHistoryReport,type HistoryFrequency} from '@/lib/testing-history-match';

export async function GET(request:Request){
 if(process.env.DEPLOYMENT_ENV!=='staging')return NextResponse.json({error:'Not found'},{status:404});
 if(!await currentSiteUser())return NextResponse.json({error:'Unauthorized'},{status:401});
 const query=new URL(request.url).searchParams,start=query.get('start')??'',end=query.get('end')??'',frequency=query.get('frequency')??'',scope=query.get('scope')??'',campaign=query.get('campaign')??undefined;
 try{if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||parseDate(start).toString()!==start||parseDate(end).toString()!==end||!['daily','weekly','monthly'].includes(frequency)||!['overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm'].includes(scope)||(campaign&&campaign.length>300))throw Error();}catch{return NextResponse.json({error:'Invalid report selection'},{status:400});}
 try{
  const records=await readTestingReadoutsForDates(start,end);
  const localized=query.get('language')==='zh'?await translatedTestingReadouts(records,true):records;
  for(const row of localized){
   const report=matchHistoryReport([row],frequency as HistoryFrequency,start,end,scope,campaign);
   if(report){const translation=row.payload as {_translation_pending?:boolean;_translation_error?:boolean};const untranslated=query.get('language')==='zh'&&Boolean(translation?._translation_pending||translation?._translation_error);return NextResponse.json({report,untranslated},{headers:{'Cache-Control':'private, no-store'}});}
  }
  return NextResponse.json({report:null,untranslated:false},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Report lookup failed'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
