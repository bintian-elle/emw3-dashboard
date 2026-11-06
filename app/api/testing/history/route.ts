import {readStoredHistoricalReport} from '@/lib/testing-report-store.server';
import {historyGenerationRequest} from '@/lib/testing-history-generation';
import {testingLatestCompleteDate} from '@/lib/testing-period';
import type {PmaxReadableReport} from '@/lib/testing-insight-presentation';
import {NextResponse} from 'next/server';
import {parseDate} from '@internationalized/date';
import {currentSiteUser} from '@/lib/current-site-user';
import {readTestingReadoutsForDates} from '@/lib/ai-job-queue';
import {translatedTestingReadouts} from '@/lib/testing-readout-translation';
import {matchHistoryReport,type HistoryFrequency} from '@/lib/testing-history-match';

export async function GET(request:Request){
 if(!await currentSiteUser())return NextResponse.json({error:'Unauthorized'},{status:401});
 const query=new URL(request.url).searchParams,start=query.get('start')??'',end=query.get('end')??'',frequency=query.get('frequency')??'',scope=query.get('scope')??'',campaign=query.get('campaign')??undefined;
 try{if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||parseDate(start).toString()!==start||parseDate(end).toString()!==end||!['daily','weekly','monthly'].includes(frequency)||!['overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media'].includes(scope)||(campaign&&campaign.length>300))throw Error();}catch{return NextResponse.json({error:'Invalid report selection'},{status:400});}
 try{
  const compareStart=query.get('compareStart'),compareEnd=query.get('compareEnd');
  const expected=historyGenerationRequest({scope,frequency,start,end,...(compareStart||compareEnd?{compareStart,compareEnd}:{})},testingLatestCompleteDate());
  const stored=await readStoredHistoricalReport(frequency as HistoryFrequency,start,end,scope,{start:expected.compareStart,end:expected.compareEnd});
  if(stored){
   const pair=stored.report as {en:PmaxReadableReport;zh:PmaxReadableReport};
   const visual=pair[query.get('language')==='zh'?'zh':'en'];
   if(visual?.run_id!==stored.id)throw Error('Stored report identity mismatch');
   for(const report of [pair.en,pair.zh]){if(report?.run_id!==stored.id)throw Error('Stored language identity mismatch');report.media_url_base=`/api/testing/history/media/${encodeURIComponent(stored.id)}/`;}
   const selected=campaign?visual.analysis.campaigns.find(item=>item.test_id===campaign):undefined;
   if(!campaign||selected){const report={title:campaign??visual.presentation.title,summary:selected?.summary??visual.presentation.summary,sections:[],generatedAt:new Date(stored.generated_at).toISOString(),visual,visualScope:campaign??'channel'};return NextResponse.json({report,untranslated:false,...(query.get('includeBoth')==='1'?{bilingual:pair}:{})},{headers:{'Cache-Control':'private, no-store'}});}
  }
  if(query.get('databaseOnly')==='1'||compareStart||compareEnd)return NextResponse.json({report:null,untranslated:false},{headers:{'Cache-Control':'private, no-store'}});
  const records=(await readTestingReadoutsForDates(start,end)).filter(row=>row.comparison_start===expected.compareStart&&row.comparison_end===expected.compareEnd);
  const localized=query.get('language')==='zh'?await translatedTestingReadouts(records,true):records;
  for(const row of localized){
   const report=matchHistoryReport([row],frequency as HistoryFrequency,start,end,scope,campaign);
   if(report){const translation=row.payload as {_translation_pending?:boolean;_translation_error?:boolean};const untranslated=query.get('language')==='zh'&&Boolean(translation?._translation_pending||translation?._translation_error);return NextResponse.json({report,untranslated},{headers:{'Cache-Control':'private, no-store'}});}
  }
  return NextResponse.json({report:null,untranslated:false},{headers:{'Cache-Control':'private, no-store'}});
 }catch{return NextResponse.json({error:'Report lookup failed'},{status:503,headers:{'Cache-Control':'private, no-store'}});}
}
