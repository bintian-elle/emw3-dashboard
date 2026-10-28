import "server-only";
import {fetchKlaviyoEventReport} from "@/lib/klaviyo-event-api";
import {mkdir,readFile,writeFile,rename} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
import {singleBucketUniqueRecipients} from "@/lib/edm-reach-metrics";
export type EdmEventMetrics={delivered:number;opens:number|null;clicks:number|null;orders:number;revenue:number};
type Aggregate={data:{attributes:{data:Array<{dimensions:string[];measurements:Record<string,number[]>}>}};links?:{next?:string|null}};
const pending=new Map<string,Promise<Record<string,EdmEventMetrics>>>();
const snapshotDaily=new WeakMap<import('./testing-edm').EdmTestingData,import('./overview-daily-metrics').OverviewDailySource>();
export function registerEdmDailySnapshot(data:import('./testing-edm').EdmTestingData,daily:import('./overview-daily-metrics').OverviewDailySource){snapshotDaily.set(data,daily);}
async function request<T>(url:string,body?:unknown):Promise<T>{
 if(!process.env.KLAVIYO_API_KEY)throw Error("Klaviyo API configuration is missing");
 const response=await fetchKlaviyoEventReport(url,{method:body?"POST":"GET",headers:{Authorization:`Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,revision:process.env.KLAVIYO_REVISION||"2026-07-15","Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store",signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error(`EDM event reporting unavailable (${response.status})`);
 return response.json();
}
export async function edmEventPerformance(campaignId:string,variationIds:string[],period:{start:string;end:string}):Promise<Record<string,EdmEventMetrics>>{
 const key=createHash("sha256").update(JSON.stringify([campaignId,variationIds,period])).digest("hex");
 const existing=pending.get(key);if(existing)return existing;
 const promise=load(campaignId,variationIds,period,key);pending.set(key,promise);
 void promise.finally(()=>{setTimeout(()=>pending.delete(key),60000).unref();}).catch(()=>{});return promise;
}
async function load(campaignId:string,variationIds:string[],period:{start:string;end:string},key:string){
 const directory=path.join(process.cwd(),".state/edm-events"),file=path.join(directory,`${key}.json`);
 try{const cached=JSON.parse(await readFile(file,"utf8"));if(cached.version===1&&Date.now()-cached.capturedAt<6*3600000)return cached.rows as Record<string,EdmEventMetrics>;}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;}
 const metricFile=path.join(directory,"metrics.json");let metrics:Array<{id:string;attributes:{name:string;integration?:{key:string}}}>;
 try{metrics=JSON.parse(await readFile(metricFile,"utf8"));}catch(error){if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;metrics=[];let url:string|null="https://a.klaviyo.com/api/metrics/";while(url){const page:{data:typeof metrics;links:{next:string|null}}=await request(url);metrics.push(...page.data);url=page.links.next;}await mkdir(directory,{recursive:true,mode:0o700});await writeFile(metricFile,JSON.stringify(metrics),{mode:0o600});}
 const rows:Record<string,EdmEventMetrics>=Object.fromEntries(variationIds.map(id=>[id,{delivered:0,opens:0,clicks:0,orders:0,revenue:0}]));
 const end=new Date(`${period.end}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+1);
 for(const name of ["Received Email","Opened Email","Clicked Email","Placed Order"]){
  const metric=metrics.find(m=>m.attributes.name===name&&m.attributes.integration?.key===(name==="Placed Order"?"shopify":"klaviyo"));if(!metric)throw Error(`EDM ${name} metric unavailable`);
  const conversion=name==="Placed Order",dimension=conversion?"$attributed_variation":"$variation",filter=conversion?"$attributed_message":"$message";
  const attributes:Record<string,unknown>={metric_id:metric.id,measurements:conversion?["count","sum_value"]:name==="Received Email"?["count"]:["unique"],by:[dimension],interval:"month",timezone:"UTC",filter:[`greater-or-equal(datetime,${period.start}T00:00:00Z)`,`less-than(datetime,${end.toISOString().slice(0,10)}T00:00:00Z)`,`equals(${filter},${JSON.stringify(campaignId)})`]};
  do{const result:Aggregate=await request("https://a.klaviyo.com/api/metric-aggregates/",{data:{type:"metric-aggregate",attributes}});
   for(const item of result.data.attributes.data){const target=rows[item.dimensions[0]];if(!target)continue;const sum=(key:string)=>(item.measurements[key]??[]).reduce((a,b)=>a+b,0);
    if(conversion){target.orders+=sum("count");target.revenue+=sum("sum_value");}else if(name==="Received Email")target.delivered+=sum("count");else target[name==="Opened Email"?"opens":"clicks"]=singleBucketUniqueRecipients(item.measurements.unique??[]);
   }
   // Pagination cursors are opaque; the next URL supplies the cursor for POST.
   const next=result.links?.next;attributes.page_cursor=next?new URL(next).searchParams.get("page[cursor]")??new URL(next).searchParams.get("page_cursor"):undefined;
   if(next&&!attributes.page_cursor)throw Error("Unsupported EDM aggregate pagination");
  }while(attributes.page_cursor);
 }
 await mkdir(directory,{recursive:true,mode:0o700});const temp=`${file}.${process.pid}.tmp`;await writeFile(temp,JSON.stringify({version:1,capturedAt:Date.now(),rows}),{mode:0o600});await rename(temp,file);return rows;
}

/** Event-time daily series, using the same attribution filters as the period totals. */
export async function edmOverviewDaily(data:import('./testing-edm').EdmTestingData):Promise<import('./overview-daily-metrics').OverviewDailySource>{
 const snapshot=snapshotDaily.get(data);if(snapshot)return snapshot;
 const campaigns=data.campaigns.filter(campaign=>campaign.hasData);
 if(!campaigns.length)return {channel:'EDM',rows:[],reach:[]};
 const directory=path.join(process.cwd(),'.state/edm-events');
 const key=createHash('sha256').update(JSON.stringify(['daily-v1',data.period,campaigns.map(c=>[c.campaignId,c.tests.map(t=>t.variationId)])])).digest('hex');
 const file=path.join(directory,`${key}.json`);
 try{const saved=JSON.parse(await readFile(file,'utf8'));if(Date.now()-saved.capturedAt<6*3600000)return saved.source;}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
 const metrics=JSON.parse(await readFile(path.join(directory,'metrics.json'),'utf8')) as Array<{id:string;attributes:{name:string;integration?:{key:string}}}>;
 type DailyAggregate={data:{attributes:{dates:string[];data:Array<{dimensions:string[];measurements:Record<string,number[]>}>}};links?:{next?:string|null}};
 const end=new Date(`${data.period.end}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+1);
 const dateFilters=[`greater-or-equal(datetime,${data.period.start}T00:00:00Z)`,`less-than(datetime,${end.toISOString().slice(0,10)}T00:00:00Z)`];
 const query=async(name:string,filter:string,by:string[],measurements:string[])=>{
  const metric=metrics.find(m=>m.attributes.name===name&&m.attributes.integration?.key===(name==='Placed Order'?'shopify':'klaviyo'));if(!metric)throw Error(`EDM daily ${name} unavailable`);
  const attributes:Record<string,unknown>={metric_id:metric.id,measurements,by,interval:'day',timezone:'UTC',filter:[...dateFilters,filter]};
  const values:Array<{date:string;id:string;measurements:Record<string,number>}>=[];
  do{
   const result:DailyAggregate=await request('https://a.klaviyo.com/api/metric-aggregates/',{data:{type:'metric-aggregate',attributes}});
   if(!Array.isArray(result.data.attributes.dates))throw Error('EDM daily dates unavailable');
   for(const row of result.data.attributes.data)result.data.attributes.dates.forEach((date,index)=>values.push({date:date.slice(0,10),id:row.dimensions[0]??'',measurements:Object.fromEntries(measurements.map(name=>[name,row.measurements[name]?.[index]??0]))}));
   const next=result.links?.next;attributes.page_cursor=next?new URL(next).searchParams.get('page[cursor]')??new URL(next).searchParams.get('page_cursor'):undefined;
   if(next&&!attributes.page_cursor)throw Error('Unsupported EDM daily pagination');
  }while(attributes.page_cursor);return values;
 };
 // Sequential campaign queries keep the existing Klaviyo rate limiter's queue bounded.
 const rows:import('./overview-daily-metrics').OverviewDailyRow[]=[];
 for(const campaign of campaigns){
  const map=new Map<string,import('./overview-daily-metrics').OverviewDailyRow>();
  for(const name of ['Received Email','Clicked Email','Placed Order']){
   const conversion=name==='Placed Order';
   const values=await query(name,`equals(${conversion?'$attributed_message':'$message'},${JSON.stringify(campaign.campaignId)})`,[conversion?'$attributed_variation':'$variation'],conversion?['count','sum_value']:name==='Received Email'?['count']:['unique']);
   const ids=new Set(campaign.tests.map(t=>t.variationId));
   for(const value of values){if(!ids.has(value.id))continue;const key=`${value.date}:${value.id}`;let row=map.get(key);if(!row){row={date:value.date,entityId:value.id,assetType:'Message',spend:0,revenue:0,orders:0,clicks:0,impressions:0,delivered:0};map.set(key,row);}
    if(conversion){row.orders+=value.measurements.count;row.revenue+=value.measurements.sum_value;}else if(name==='Received Email')row.delivered!+=value.measurements.count;else row.clicks+=value.measurements.unique;
   }
  }
  rows.push(...map.values());
 }
 const unique=await query('Received Email',`any($message,${JSON.stringify(campaigns.map(c=>c.campaignId))})`,[],['unique']);
 const source:import('./overview-daily-metrics').OverviewDailySource={channel:'EDM',rows,reach:unique.map(row=>({date:row.date,value:row.measurements.unique}))};
 await mkdir(directory,{recursive:true,mode:0o700});const temporary=`${file}.${process.pid}.tmp`;await writeFile(temporary,JSON.stringify({capturedAt:Date.now(),source}),{mode:0o600});await rename(temporary,file);return source;
}
