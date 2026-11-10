import {createHash,randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {currentSiteUser} from '@/lib/current-site-user';
import {generationOriginAllowed,scheduledGenerationAllowed} from '@/lib/testing-generation-access';
import {authOrigin} from '@/lib/site-auth';
import {testingLatestCompleteDate} from '@/lib/testing-period';
import {reportOutputSchema} from '@/lib/testing-readable-schema';
import {historyGenerationRequest} from '@/lib/testing-history-generation';
import {enqueueHistoryGeneration,findReusableHistory,historyGenerationStatus} from '@/lib/testing-report-store.server';
import {enqueueTemporaryJob,readTemporaryJob} from '@/lib/testing-temporary-reports.server';
import {captureManualFallback} from '@/lib/testing-manual-fallback.server';
import {validatePromptRun} from '@/lib/testing-prompts-contract';
import {reportDatabaseEnvironment} from '@/lib/testing-report-environment';
import {testingReportScope,type TestingReportChannel} from '@/lib/testing-report-scope';
import {testingCampaignReportScope} from '@/lib/testing-report-scope';
import {getTestingInventory} from '@/lib/testing-inventory';
import type {TestingInventoryChannel} from '@/lib/testing-inventory-model';
import {trialMetricRows} from '@/lib/testing-prompt-trial-report';
import type {PresentationDataset} from '@/lib/testing-insight-presentation';
import {redditContentPeriod} from '@/lib/reddit-content-testing';
import {readRequiredTestingDataSnapshot} from '@/lib/testing-data-cache';
import {redditSinceStartLabel,redditSinceStartPreset} from '@/lib/reddit-testing-period';
import {getSocialPerformance} from '@/lib/testing-social';
import {contentTestingStartDates} from '@/lib/testing-report-scope';
import {validRedditTestingSnapshot} from '@/lib/testing-reddit-snapshot';
export const runtime='nodejs';
const channels=['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media'];
const environment=()=>process.env.DEPLOYMENT_ENV==='staging'?'staging':'production';
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(request:Request){
 const user=await currentSiteUser();if(!user)return reply({error:'Unauthorized'},401);
 const params=new URL(request.url).searchParams,id=params.get('id')??'';if(!/^[a-f0-9-]{36}$/.test(id))return reply({error:'Invalid job'},400);
 const job=params.get('purpose')==='temporary'?await readTemporaryJob(environment(),id,user.sub):await historyGenerationStatus(id,reportDatabaseEnvironment());return job?reply({job:{id:job.id,status:job.status,error:job.error??null,...('result' in job?{result:job.result,createdAt:job.createdAt}:{})}}):reply({error:'Not found'},404);
}
export async function POST(request:Request){
 const scheduled=scheduledGenerationAllowed(request.url,request.headers.get('authorization'),process.env.CRON_SECRET?.trim()||process.env.AI_WORKER_SECRET?.trim(),process.env.DEPLOYMENT_ENV??'production');
 const user=scheduled?{sub:'scheduled-content-testing'}:await currentSiteUser();if(!user)return reply({error:'Unauthorized'},401);
 const localPreview=process.env.LOCAL_PRODUCTION_PREVIEW==='1'&&['localhost','127.0.0.1','[::1]'].includes(new URL(request.url).hostname);
 if(!scheduled&&!generationOriginAllowed(request.url,request.headers.get('origin'),localPreview?new URL(request.url).origin:authOrigin(request.url),localPreview))return reply({error:'Invalid origin'},403);
 let period,body:Record<string,unknown>;try{body=await request.json();period=historyGenerationRequest(body,testingLatestCompleteDate());}catch{return reply({error:'Invalid report selection'},400);}
 const temporary=body.purpose==='temporary',language=temporary&&body.language==='zh'?'zh':'en',campaign=temporary&&typeof body.campaign==='string'?body.campaign:'';
 const lifetime=body.coverage==='lifetime';
 if(lifetime&&(!scheduled||temporary||!['reddit','social-media'].includes(period.scope)||period.kind!=='weekly'))return reply({error:'Invalid scheduled request'},400);
 if(scheduled&&(temporary||!lifetime&&period.scope!=='overview'))return reply({error:'Invalid scheduled request'},400);
 if(campaign.length>200||campaign&&period.scope==='overview')return reply({error:'Invalid campaign'},400);
 const socialLifetime=lifetime&&period.scope==='social-media';
 const jobScope=socialLifetime?'social-lifetime':lifetime?'reddit-lifetime':period.scope;
 const social= socialLifetime?await getSocialPerformance().catch(()=>null):null;
 if(socialLifetime&&(!social?.capturedAt||social.error))return reply({error:'Social Lifetime snapshot is not available.'},503);
 const current=social?{start:contentTestingStartDates['social-media'],end:social.capturedAt.slice(0,10)}:lifetime?redditContentPeriod():{start:period.start,end:period.end};
 const comparison=lifetime?null:{start:period.compareStart,end:period.compareEnd};
 try{
  const existing=await findReusableHistory(period.kind,period.start,period.end,period.compareStart,period.compareEnd,jobScope) as {en?:{run_id?:string;analysis?:{campaigns?:Array<{test_id:string}>};media_url_base?:string};zh?:{run_id?:string;analysis?:{campaigns?:Array<{test_id:string}>};media_url_base?:string}}|null;
  if(existing?.en&&existing.zh&&(!campaign||existing.en.analysis?.campaigns?.some(item=>item.test_id===campaign))){for(const report of [existing.en,existing.zh])if(report.run_id)report.media_url_base=`/api/testing/history/media/${encodeURIComponent(report.run_id)}/`;return reply({job:{status:'completed',result:temporary?{[language]:existing[language]}:existing,source:'saved'}});}
  const selected=period.scope==='overview'&&!temporary?[...channels,'overview']:[period.scope];
  const saved:Record<string,unknown>={},jobs:Record<string,unknown>={};
  const publishedLifetime=lifetime&&!socialLifetime?await readRequiredTestingDataSnapshot<{data:unknown}>('reddit',{preset:redditSinceStartPreset}):null;
  const lifetimeSnapshot=social??publishedLifetime?.payload.data??null;
  if(lifetime&&!socialLifetime&&!validRedditTestingSnapshot(lifetimeSnapshot,current,redditSinceStartLabel))throw Error('Reddit Lifetime snapshot is not published.');
  if(temporary&&period.scope==='overview')for(const channel of channels){const report=await findReusableHistory(period.kind,period.start,period.end,period.compareStart,period.compareEnd,channel);if(report)saved[channel]=report;}
  for(const channel of selected){
   if(period.scope==='overview'&&channel!=='overview'){
    const report=await findReusableHistory(period.kind,period.start,period.end,period.compareStart,period.compareEnd,channel);if(report){saved[channel]=report;continue;}
   }
   const validated=validatePromptRun({channel,prompt:channel,mode:'analysis',start:period.start,end:period.end,compareStart:period.compareStart,compareEnd:period.compareEnd,campaign:campaign||'all',language:'en',versions:{[channel]:'current',readability:'current'}});
   const input=lifetime?{...validated,...current,comparison:null}:validated;
   let frozen:Record<string,unknown>;
   if(channel==='overview'){
    // Overview consumes the scoped channel reports assembled by the worker.
    frozen=await captureManualFallback(input) as Record<string,unknown>;
   }else if(channel==='social-media'){
    const scope=testingReportScope(channel as TestingReportChannel,current,comparison);
    frozen=await captureManualFallback(input,scope,social??undefined) as Record<string,unknown>;
    frozen.testing_scope=scope;
   }else{
    const inventory=await getTestingInventory(),key=channel as TestingInventoryChannel;
    if(inventory.unavailable.includes(key))throw Error(`Campaign inventory is unavailable for ${channel}`);
    const names=inventory.items.filter(item=>item.channelKey===key&&(!campaign||item.name===campaign)).map(item=>item.name);
    if(!names.length)throw Error('Campaign is outside the configured testing scope.');
    const captured=await Promise.all(names.map(async name=>{
     const scope=testingCampaignReportScope(key,name,current,comparison);
     const packet=await captureManualFallback({...input,campaign:name},scope,lifetimeSnapshot??undefined);
     return {name,scope,packet};
    }));
    const template=captured[0].packet;
    const datasets:Record<string,PresentationDataset>={input:{id:'input',scopes:['channel',...names],xKey:'category',columns:{category:'category'},rows:[]}};
    for(const {name,packet} of captured){
     const source=packet.dashboard[0];const rows=trialMetricRows(source&&'snapshot' in source?source.snapshot:null);if(!rows.length)continue;
     const columns:Record<string,string>={category:'category'};
     for(const row of rows)for(const field of Object.keys(row))if(field!=='category')columns[field]=['spend','revenue','cpc','cpa','cpm'].includes(field)?'USD':['ctr','cvr'].includes(field)?'fraction':field==='roas'?'ratio':field;
     const id=name+'.entities';datasets[id]={id,scopes:[name,'channel'],xKey:'category',columns,rows};
    }
    const context={...template.visual_context,datasets,...(lifetime?{scope:'lifetime'}:{})};
    frozen={...template,campaigns:names,tests:captured.map(({name,scope,packet})=>({test_id:name,testing_scope:scope,dashboard:packet.dashboard})),testing_campaign_scopes:Object.fromEntries(captured.map(({name,scope})=>[name,scope])),dashboard:undefined,testing_scope:undefined,visual_context:context,presentation_datasets:context.datasets,source_data_gaps:captured.flatMap(({name,scope,packet})=>scope.testStart===null?[`${name}: testing start is not verified.`]:packet.source_data_gaps.map(gap=>`${name}: ${gap}`))};
   }
   const versions=Object.fromEntries(await Promise.all([channel,'readability'].map(async name=>[name,{content:await readFile(path.join(process.cwd(),'prompts/content-testing',`${name}.md`),'utf8')}] as const)));
   frozen.generation_purpose=temporary?'temporary':'history';frozen.requested_language=language;
   if(temporary&&channel!=='overview'&&!campaign)frozen.campaigns=[];
   const schema=reportOutputSchema(JSON.parse(await readFile(path.join(process.cwd(),'scripts/content-testing/readable-schema.json'),'utf8')),temporary,language);
   jobs[lifetime?jobScope:channel]={...(temporary&&channel!=='overview'?{_generation_stage:{kind:campaign?'campaign':'channel',campaign:campaign||null}}:{}),mode:'analysis',campaign:campaign||'all',period:{channel,...current},language,versions,frozen_input:frozen,output_schema:schema};
  }
  const promptRevision=createHash('sha256').update(JSON.stringify((jobs[period.scope] as {versions:unknown})?.versions??{})).digest('hex');
  const jobEnvironment=temporary?environment():reportDatabaseEnvironment();
  const id=randomUUID(),payload={period,jobs,saved,temporary,campaign,language,...(lifetime?{lifetimeSnapshot}:{})},job=temporary?await enqueueTemporaryJob(jobEnvironment,user.sub,period.scope,campaign,language,promptRevision,period,payload):await enqueueHistoryGeneration(id,jobEnvironment,jobScope,period,user.sub,payload);
  if(job.status==='queued'){const child=spawn(process.execPath,['--experimental-strip-types',path.join(process.cwd(),'scripts/content-testing/manual-worker.mjs'),job.id,temporary?'temporary':'history',jobEnvironment],{cwd:process.cwd(),env:process.env,detached:true,stdio:'ignore'});child.unref();}
  if(temporary&&job.status==='completed'){const done=await readTemporaryJob(environment(),job.id,user.sub);return reply({job:{id:job.id,status:job.status,result:done?.result,createdAt:done?.createdAt}});}
  return reply({job},202);
 }catch(error){return reply({error:error instanceof Error?error.message:'Unable to prepare report'},503);}
}
