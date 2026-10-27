import {assertProjectSource,dashboardProject} from './ai-dashboard-project.ts';
import {dashboardToday,lastCompletedWeek} from './ai-dashboard-periods.ts';
import {queryOverview} from './ai-dashboard-overview.ts';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

export const SNAPSHOT_RANGE={start:'2026-09-01',end:'2026-09-30'};
export const SNAPSHOT_ID='2026-09-snapshot-20261026';
export const SOURCES=['google_ads','meta_ads','tiktok_ads','microsoft_ads','reddit_ads','chatgpt_ads','edm','store','paid_media','ga4'] as const;
export const GROUPS=['overview','day','campaign','channel'] as const;
export type Source=typeof SOURCES[number];
export type Group=typeof GROUPS[number];
export type Query={source:Source;groupBy:Group;start:string;end:string};
export type DataRow={label:string;[key:string]:string|number|null};
export type Widget={id:string;title:string;kind:'metric'|'line'|'bar'|'table';source:Source;groupBy:Group;metrics:string[];sortBy?:string|null};
export type ReportSpec={title:string;summary:string;range:{start:string;end:string};widgets:Widget[]};
export type Dataset={source:Source;groupBy:Group;range:{start:string;end:string};currency:string;timezone:string;rows:DataRow[];warnings:string[];coverage?:string;comparisons?:Record<'pop'|'yoy',{range:{start:string;end:string};rows:DataRow[];warnings:string[]}>};
export type DashboardReport=Omit<ReportSpec,'widgets'>&{snapshotId:string;generatedAt:string;warnings:string[];widgets:Array<Widget&Dataset>};
const paid=['spend','revenue','conversions','impressions','clicks','roas','ctr','cpc','cpa'];
const edm=['revenue','conversions','delivered','clicks','opens','campaignRevenue','flowRevenue','ctr'];
export const METRICS:Record<Source,string[]>={google_ads:paid,meta_ads:paid,tiktok_ads:paid,microsoft_ads:paid,reddit_ads:paid,chatgpt_ads:paid,edm,store:['revenue','conversions'],paid_media:paid,ga4:['sessions','users','revenue','conversions','engagementRate']};
for(const source of SOURCES){const metrics=[...METRICS[source]];METRICS[source]=[...metrics,...metrics.flatMap(m=>[m+'_pop',m+'_yoy'])];}
export function snapshotDirectory(){return process.env.AI_DASHBOARD_SNAPSHOT_DIR||path.join(process.cwd(),'.state','ai-dashboard','snapshots',SNAPSHOT_ID);}
function date(value:unknown){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value+'T12:00:00Z'))||new Date(value+'T12:00:00Z').toISOString().slice(0,10)!==value)throw Error('Invalid date. Use YYYY-MM-DD.');return value;}
export function validateRange(start:unknown,end:unknown){const a=date(start),b=date(end);if(a>b)throw Error('Start date must precede end date.');if(a<'2024-01-01'||b>dashboardToday()||(Date.parse(b)-Date.parse(a))/86400000>92)throw Error('Choose up to 93 days between 2024-01-01 and today.');return{start:a,end:b};}
export function resolveRequestedRange(prompt:string,today=dashboardToday()){
 const dates=prompt.match(/\d{4}-\d{2}-\d{2}/g);
 if(dates?.length===2)return{start:date(dates[0]),end:date(dates[1])};
 if(/last\s+week|上周|上一周/i.test(prompt))return lastCompletedWeek(today);
 const year=prompt.match(/\b(20\d{2})\b/)?.[1]||today.slice(0,4);
 const subset=prompt.match(/(?:september|9月)\s*(\d{1,2})[日号]?\s*(?:to|through|[-–—至到])\s*(?:september|9月)?\s*(\d{1,2})/i);
 if(subset)return{start:date(`${year}-09-${subset[1].padStart(2,'0')}`),end:date(`${year}-09-${subset[2].padStart(2,'0')}`)};
 if(/last\s+30\s+days|最近\s*30\s*天|过去\s*30\s*天/i.test(prompt))return{start:new Date(Date.parse(today+'T12:00:00Z')-30*86400000).toISOString().slice(0,10),end:new Date(Date.parse(today+'T12:00:00Z')-86400000).toISOString().slice(0,10)};
 if(/last\s+month|上个?月|上个月/i.test(prompt)){const end=new Date(today+'T12:00:00Z');end.setUTCDate(0);const start=new Date(end);start.setUTCDate(1);return{start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};}
 if(/9月|september/i.test(prompt))return{start:`${year}-09-01`,end:`${year}-09-30`};
 return null;
}
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Expected object.');return value as Record<string,unknown>;}
function fields(value:Record<string,unknown>,allowed:string[]){if(Object.keys(value).some(key=>!allowed.includes(key)))throw Error('Unsupported field in report configuration.');}
function text(value:unknown,max:number){if(typeof value!=='string'||!value.trim()||value.length>max)throw Error('Invalid report text.');return value;}
export function validateQuery(value:unknown):Query{const q=object(value);fields(q,['source','groupBy','start','end']);if(!SOURCES.includes(q.source as Source))throw Error('Unsupported data source. Choose a configured marketing source.');if(!GROUPS.includes(q.groupBy as Group))throw Error('Unsupported grouping.');return{source:q.source as Source,groupBy:q.groupBy as Group,...validateRange(q.start,q.end)};}
export function validateReport(value:unknown):ReportSpec{
 const report=object(value);fields(report,['title','summary','range','widgets']);const range=object(report.range);fields(range,['start','end']);
 const result:ReportSpec={title:text(report.title,150),summary:text(report.summary,3000),range:validateRange(range.start,range.end),widgets:[]};
 if(!Array.isArray(report.widgets)||report.widgets.length>24)throw Error('Choose up to 24 widgets.');
 const ids=new Set<string>();
 for(const value of report.widgets){const w=object(value);fields(w,['id','title','kind','source','groupBy','metrics','sortBy']);const q=validateQuery({source:w.source,groupBy:w.groupBy,...result.range});
 if(!['metric','line','bar','table'].includes(String(w.kind)))throw Error('Unsupported widget kind.');
 const id=text(w.id,60);if(!/^[a-zA-Z0-9_-]+$/.test(id)||ids.has(id))throw Error('Widget IDs must be unique.');ids.add(id);
 if(!Array.isArray(w.metrics)||!w.metrics.length||w.metrics.length>6||new Set(w.metrics).size!==w.metrics.length||!w.metrics.every(m=>METRICS[q.source].includes(m)))throw Error('Unsupported metric for this source.');
 if(q.source==='paid_media'&&!['channel','campaign'].includes(q.groupBy)&&w.metrics.some(m=>/^(revenue|conversions|roas|cpa)(_|$)/.test(m)))throw Error('Platform attribution cannot be summed across channels. Use channel grouping.');
 if(w.sortBy!=null&&(typeof w.sortBy!=='string'||!METRICS[q.source].includes(w.sortBy)||w.kind==='line'||w.kind==='metric'))throw Error('Invalid ranking metric.');
 const unit=(metric:string)=>/_pop$|_yoy$/.test(metric)?'comparison':['spend','revenue','cpc','cpa','campaignRevenue','flowRevenue'].includes(metric)?'currency':metric==='roas'?'ratio':['ctr','engagementRate'].includes(metric)?'percent':'count';
 if(['line','bar'].includes(String(w.kind))&&new Set(w.metrics.map(unit)).size>1)throw Error('Mixed chart units require separate widgets.');
 if(w.kind==='metric'&&(w.metrics.length!==1||q.groupBy!=='overview'))throw Error('Metric cards require one metric and overview grouping.');
 if(w.kind==='line'&&q.groupBy!=='day')throw Error('Trend charts require daily grouping.');
 result.widgets.push({id,title:text(w.title,150),kind:w.kind as Widget['kind'],source:q.source,groupBy:q.groupBy,metrics:w.metrics,...w.sortBy?{sortBy:String(w.sortBy)}:{}});}
 return result;
}
type Raw=Record<string,unknown>;
async function readRows(source:string,table:string):Promise<Raw[]>{const data=JSON.parse(await readFile(path.join(snapshotDirectory(),'last-month',source,table+'.json'),'utf8'));if(!Array.isArray(data.rows))throw Error('Invalid snapshot data.');return data.rows;}
const numeric=(v:unknown)=>{const n=Number(v??0);if(!Number.isFinite(n)||n<0)throw Error('Invalid numeric snapshot value.');return n;};
const ratio=(a:number,b:number)=>b>0?a/b:null;
export async function querySnapshot(input:unknown):Promise<Dataset>{
 const q=validateQuery(input);assertProjectSource(q.source);if(dashboardProject()!=='bluevua'||q.start<'2026-09-01'||q.end>'2026-09-30'||!['google_ads','edm'].includes(q.source))return queryOverview(q);const inRange=(r:Raw,key='date')=>{const d=String(r[key]).slice(0,10);return d>=q.start&&d<=q.end;};
 const groups=new Map<string,Record<string,number>>();
 const add=(label:string,values:Record<string,number>)=>{const sum=groups.get(label)||{};for(const [key,value]of Object.entries(values))sum[key]=(sum[key]||0)+value;groups.set(label,sum);};
 let currency='USD',timezone='US/Eastern';const warnings=['Fixed snapshot; no live data refresh.','Google Ads and EDM use different attribution models. Do not add their revenue together.'];
 if(q.source==='google_ads'){
  const [accounts,campaigns]=await Promise.all([readRows('google-ads','dim_account'),readRows('google-ads','dim_campaign')]);currency=String(accounts[0]?.currency_code||'USD');timezone=String(accounts[0]?.time_zone||'unknown');
  const dimensions=new Map(campaigns.map(c=>[String(c.campaign_id),c]));
  const rows=await readRows('google-ads',q.groupBy==='campaign'||q.groupBy==='channel'?'fact_campaign_daily':'fact_account_daily');
  for(const r of rows.filter(r=>inRange(r))){const c=dimensions.get(String(r.campaign_id));const label=q.groupBy==='day'?String(r.date).slice(0,10):q.groupBy==='campaign'?String(c?.campaign_name||r.campaign_id):q.groupBy==='channel'?String(c?.advertising_channel_type||'Unknown'):'Google Ads';
   add(label,{spend:numeric(r.cost_micros)/1e6,revenue:numeric(r.conversions_value),conversions:numeric(r.conversions),impressions:numeric(r.impressions),clicks:numeric(r.clicks)});}
 }else{
  const [campaigns,flows,metadata]=await Promise.all([readRows('edm','fact_campaign_performance'),readRows('edm','fact_flow_daily'),readRows('edm','dim_campaign')]);
  const names=new Map(metadata.map(r=>[String(r.campaign_id),String(r.campaign_name)]));
  const flowNames=new Map((await readRows('edm','dim_flow')).map(r=>[String(r.flow_id),String(r.flow_name)]));
  for(const [kind,rows]of [['campaign',campaigns],['flow',flows]] as const){for(const r of rows.filter(r=>inRange(r,kind==='campaign'?'send_date':'date'))){
   const label=q.groupBy==='day'?String(r[kind==='campaign'?'send_date':'date']).slice(0,10):q.groupBy==='channel'?(String(r.send_channel).toLowerCase()==='sms'?'SMS':'Email'):q.groupBy==='campaign'?(kind==='campaign'?`Campaign · ${names.get(String(r.campaign_id))||r.campaign_id}`:`Flow · ${flowNames.get(String(r.flow_id))||r.flow_id}`):'EDM';
   const revenue=numeric(r.conversion_value);add(label,{revenue,conversions:numeric(r.conversions),delivered:numeric(r.delivered),clicks:numeric(r.clicks_unique),opens:numeric(r.opens_unique),campaignRevenue:kind==='campaign'?revenue:0,flowRevenue:kind==='flow'?revenue:0});}}
  warnings.push('EDM clicks/opens are sums of message-level unique counts, not deduplicated people. Campaign reporting is grouped by send date; flow reporting by activity date.');
 }
 if(q.groupBy==='day')for(let d=new Date(q.start+'T12:00:00Z');d.toISOString().slice(0,10)<=q.end;d.setUTCDate(d.getUTCDate()+1)){const day=d.toISOString().slice(0,10);if(!groups.has(day))throw Error('Snapshot is missing a requested day; no zero values were invented.');}
 if(!groups.size)throw Error('No data available for this query.');
 const rows=Array.from(groups,([label,s])=>({label,...s,...q.source==='google_ads'?{roas:ratio(s.revenue,s.spend),ctr:ratio(s.clicks,s.impressions),cpc:ratio(s.spend,s.clicks),cpa:ratio(s.spend,s.conversions)}:{ctr:ratio(s.clicks,s.delivered)}})) as DataRow[];
 rows.sort((a,b)=>q.groupBy==='day'?a.label.localeCompare(b.label):Number(b.revenue)-Number(a.revenue));
 return{source:q.source,groupBy:q.groupBy,range:{start:q.start,end:q.end},currency,timezone,rows,warnings};
}
export const queryKey=(q:Query)=>JSON.stringify([dashboardProject(),q.source,q.groupBy,q.start,q.end]);
export async function materializeReport(value:unknown,receipts:Query[]):Promise<DashboardReport>{
 const report=validateReport(value);const permitted=new Set(receipts.map(queryKey));const datasets=new Map<string,Dataset>();
 const widgets=[];
 for(const widget of report.widgets){const query={source:widget.source,groupBy:widget.groupBy,...report.range};const key=queryKey(query);if(!permitted.has(key))throw Error('Report references data without a successful read-only tool query.');if(!datasets.has(key))datasets.set(key,await querySnapshot(query));const dataset=datasets.get(key)!;const rows=widget.sortBy?[...dataset.rows].sort((a,b)=>Number(b[widget.sortBy!])-Number(a[widget.sortBy!])):dataset.rows;widgets.push({...widget,...dataset,rows});}
 return{...report,widgets,snapshotId:dashboardProject()==='bluevua'?SNAPSHOT_ID:`${dashboardProject()}-cache`,generatedAt:new Date().toISOString(),warnings:[...new Set(widgets.flatMap(w=>w.warnings))]};
}
export function canReadJob(job:{owner:string},owner:string){return job.owner===owner;}
export const REPORT_SCHEMA={type:'object',additionalProperties:false,properties:{title:{type:'string'},summary:{type:'string'},range:{type:'object',additionalProperties:false,properties:{start:{type:'string'},end:{type:'string'}},required:['start','end']},widgets:{type:'array',items:{type:'object',additionalProperties:false,properties:{id:{type:'string'},title:{type:'string'},kind:{type:'string',enum:['metric','line','bar','table']},source:{type:'string',enum:SOURCES},groupBy:{type:'string',enum:GROUPS},metrics:{type:'array',items:{type:'string'}},sortBy:{type:['string','null']}},required:['id','title','kind','source','groupBy','metrics','sortBy']}}},required:['title','summary','range','widgets']};

export function validDashboardOrigin(origin:string|null,host:string|null){try{const url=new URL(origin||"");return url.origin===origin&&url.host===host&&(url.protocol==="https:"||url.protocol==="http:"&&["localhost","127.0.0.1","[::1]"].includes(url.hostname));}catch{return false;}}
