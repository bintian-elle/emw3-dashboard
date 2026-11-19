import {dashboardProject,projectOverviewDirectory,PROJECT_SOURCES} from './ai-dashboard-project.ts';
import {spawn} from 'node:child_process';
import {access,readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {comparisonRanges,PAID_CHANNELS} from './ai-dashboard-overview.ts';
async function runCommand(command:string,args:string[],cwd:string,env:NodeJS.ProcessEnv){
 const child=spawn(command,args,{cwd,env,stdio:'inherit'});
 await new Promise<void>((resolve,reject)=>{
  child.on('error',()=>reject(Error('Local data adapter could not start.')));
  child.on('close',code=>code===0?resolve():reject(Error('Local data adapter failed; check credentials and reporting data.')));
 });
}
async function prepare(range:{start:string;end:string},options:{force?:boolean}){
 const project=dashboardProject();
 if(project==='bluevua'&&range.start>='2026-09-01'&&range.end<='2026-09-30')return;
 const shopifyCli=process.env.AI_DASHBOARD_SHOPIFY_CLI||'/home/ubuntu/work/anc-data-tools/.venv/bin/anc-shopify';
 const useNativeShopify=project==='bluevua'&&await access(shopifyCli).then(()=>true,()=>false);
 const comparison=comparisonRanges(range),ranges=[range,comparison.pop,comparison.yoy];const root=project==='bluevua'?path.join(process.cwd(),'.state/ai-dashboard/overview'):projectOverviewDirectory();const files=await readdir(root).catch(()=>[]);
 const cached=await Promise.all(files.filter(f=>f.endsWith('.json')).map(async file=>{try{return JSON.parse(await readFile(path.join(root,file),'utf8')) as {project?:string;complete?:boolean;totals?:Record<string,unknown>;source:string;start:string;end:string;fetchedAt:string;status?:string;rows?:Array<{date:string}>;tables?:Record<string,Array<{date:string}>>};}catch{return null;}}));
 const covered=(source:string,r:{start:string;end:string})=>cached.some(data=>{if(!data||(project!=='bluevua'&&data.project!==project)||data.source!==source||data.start>r.start||data.end<r.end)return false;const age=Date.now()-Date.parse(data.fetchedAt);if(!Number.isFinite(age))return false;const rows=data.rows||data.tables?.[source==='google_ads'?'fact_account_daily':'fact_metric_daily']||[];const expected=(Date.parse(r.end)-Date.parse(r.start))/86400000+1;const complete=new Set(rows.map(row=>String(row.date).slice(0,10)).filter(day=>day>=r.start&&day<=r.end)).size===expected;if(data.status==='unavailable'||!complete&&!data.totals)return age<900000;return data.complete!==false||age<900000;});
 if(useNativeShopify){
  const directory=projectOverviewDirectory();
  for(const [index,period] of ranges.entries()){
   const existing=await readFile(path.join(directory,`store-${period.start}-${period.end}.json`),'utf8').then(JSON.parse).catch(()=>null);
   if(!options.force&&existing?.identityVerified===true&&existing?.complete===true)continue;
   try{
    await runCommand('python3',[path.join(process.cwd(),'scripts/cache-bluevua-shopify.py'),'--cli',shopifyCli,
     '--output',directory,'--start',period.start,'--end',period.end],process.cwd(),process.env);
   }catch(error){
    if(index===0)throw Error('Bluevua Shopify refresh failed. Existing data was preserved.',{cause:error});
    console.warn('Bluevua Shopify comparison period unavailable',period.start,period.end);
   }
  }
 }
 const required=project==='bluevua'?[...PAID_CHANNELS,'edm']:PROJECT_SOURCES[project].filter(s=>s!=='paid_media');
 if(!options.force&&ranges.every(r=>required.every(s=>covered(s,r))))return;
 const reports=process.env.AI_DASHBOARD_REPORT_ROOT||path.resolve(process.cwd(),'../../slack-ads-report');const env={...process.env,DASHBOARD_ROOT:process.cwd(),...options.force?{AI_DASHBOARD_FORCE_REFRESH:'1'}:{},AI_DASHBOARD_RANGES:JSON.stringify(ranges.map(r=>[r.start,r.end]))};
 const run=(command:string,args:string[])=>runCommand(command,args,reports,env);
 if(project!=='bluevua'){await run(process.env.AI_DASHBOARD_PYTHON||path.join(reports,'.venv/bin/python'),[path.join(reports,'scripts/cache-builder-projects.py'),'--project',project]);return;}
 await run(process.execPath,[path.join(reports,'scripts/export-dashboard-builder-data.cjs')]);
 await run(path.join(reports,'.venv/bin/python'),[path.join(reports,'scripts/cache-builder-channels.py')]);
}

const pending=new Map<string,Promise<void>>();
export async function prepareDashboardData(range:{start:string;end:string},options:{force?:boolean}={}){const key=JSON.stringify([dashboardProject(),range,!!options.force]);if(!pending.has(key))pending.set(key,prepare(range,options).finally(()=>pending.delete(key)));return pending.get(key)!;}
