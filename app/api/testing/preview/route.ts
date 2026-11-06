import {localStagingReadoutDirectory,readStagingReadoutSnapshot} from "@/lib/staging-readout-snapshots";
import {NextResponse} from 'next/server';
import {currentSiteUser} from '@/lib/current-site-user';
import {readLocalPromptPreview} from '@/lib/testing-prompt-preview.server';
import {readTestingPageReadouts,reconcileExpectedTestingPageReadouts} from '@/lib/testing-readout-page-cache';
import {testingReadoutKey} from '@/lib/testing-readout-contract';
import {testingPeriodInput,testingPeriodLabels} from '@/lib/testing-google';
import {resolveTestingPeriod,testingLatestCompleteDate} from '@/lib/testing-period';
import type {PromptPreviewReport} from '@/lib/testing-prompt-preview';
import {usesUnifiedReports} from '@/lib/testing-report-environment';
export async function GET(request:Request){
 if(!await currentSiteUser())return NextResponse.json({error:'Unauthorized'},{status:401});
 if(usesUnifiedReports())return NextResponse.json({disabled:true},{headers:{'Cache-Control':'private, no-store'}});
 const query=new URL(request.url).searchParams,language=query.get('language')==='zh'?'zh':'en';
 const preview=await readLocalPromptPreview(language);
 if(preview)return NextResponse.json(preview,{headers:{'Cache-Control':'private, no-store'}});
 const preset=query.get('period')??'lastWeek';
 const period={label:testingPeriodLabels[testingPeriodInput({period:preset}).preset??'lastWeek'],...resolveTestingPeriod(testingLatestCompleteDate(),testingPeriodInput(Object.fromEntries(query.entries())))};
 const key=testingReadoutKey(period);
 const keys=[...(key?[key]:[]),'period:reddit-lifetime','period:social-lifetime'];
 const localDirectory=localStagingReadoutDirectory();
 const localRecords=localDirectory?await readStagingReadoutSnapshot(localDirectory,keys,language):null;
 const expected=localRecords===null?query.get('expected'):null;
 if(expected){try{if(expected.length>8192)throw Error('Invalid version');await reconcileExpectedTestingPageReadouts(keys,language,JSON.parse(expected));}catch{return NextResponse.json({error:'Published readout unavailable.'},{status:503,headers:{'Cache-Control':'private, no-store'}});}}
 const localized=localRecords??await readTestingPageReadouts(keys,language,true);
 const reports=localized.flatMap(record=>(record.payload as {channel_reports?:PromptPreviewReport[]}).channel_reports??[]).filter(report=>report.language===(language==='zh'?'zh-CN':'en'));
 return NextResponse.json(reports.length?{manifest:{run_id:'published-channel-reports',language:language==='zh'?'zh-CN':'en',status:'completed',period},reports,status:{status:'completed'}}:{disabled:true},{headers:{'Cache-Control':'private, no-store'}});
}
