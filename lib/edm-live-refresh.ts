import "server-only";
import { edmContentTestCampaignIds, edmModulePatterns } from "./edm-content-testing-scope";
import { dailyRows } from "./edm-live-daily";
import { parseDate, toZoned } from "@internationalized/date";
import { fetchKlaviyoEventReport } from "./klaviyo-event-api";
import { singleBucketUniqueRecipients } from "./edm-reach-metrics";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "./testing-google";
import type { EdmEventMetrics } from "./edm-event-performance";
import type { EdmTestingData, EdmTest, EdmTestCampaign } from "./testing-edm";
import type { OverviewDailyRow, OverviewDailySource } from "./overview-daily-metrics";

type Metric={id:string;attributes:{name:string;integration?:{key:string}}};
type AggregateRow={dimensions:string[];measurements:Record<string,number[]>};
type Aggregate={data:{attributes:{dates?:string[];data:AggregateRow[]}};links?:{next?:string|null}};
type CampaignMessage={type:string;id:string;attributes:{definition?:{content?:{subject?:string;preview_text?:string;from_label?:string}}}};
type CampaignDocument={data:{id:string;attributes:{name:string;status:string;send_time?:string|null;scheduled_at?:string|null};relationships?:{"campaign-messages"?:{data?:Array<{id:string}>}}};included?:CampaignMessage[]};
export type EdmTestingSnapshot={data:EdmTestingData;daily:OverviewDailySource};

async function request<T>(url:string,body?:unknown):Promise<T>{
 if(!process.env.KLAVIYO_API_KEY)throw Error("Klaviyo API configuration is missing");
 const response=await fetchKlaviyoEventReport(url,{method:body?"POST":"GET",headers:{Authorization:`Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`,revision:process.env.KLAVIYO_REVISION||"2026-07-15","Content-Type":"application/json",accept:"application/json","Cache-Control":"no-cache"},...(body?{body:JSON.stringify(body)}:{}),cache:"no-store"});
 if(!response.ok)throw Error(`Klaviyo refresh unavailable (${response.status})`);
 return response.json() as Promise<T>;
}
async function metrics(){
 const all:Metric[]=[];let url:string|null="https://a.klaviyo.com/api/metrics/";const seen=new Set<string>();
 while(url){if(seen.has(url))throw Error("Incomplete Klaviyo metric listing");seen.add(url);const parsed=new URL(url);if(parsed.origin!=="https://a.klaviyo.com")throw Error("Invalid Klaviyo pagination");const page:{data:Metric[];links?:{next?:string|null}}=await request(url);if(!Array.isArray(page.data))throw Error("Invalid Klaviyo metric listing");all.push(...page.data);url=page.links?.next??null;}
 return all;
}
function metricId(all:Metric[],name:string){const metric=all.find(item=>item.attributes.name===name&&item.attributes.integration?.key===(name==="Placed Order"?"shopify":"klaviyo"));if(!metric)throw Error(`Klaviyo ${name} metric unavailable`);return metric.id;}
function boundary(day:string,zone:string){return toZoned(parseDate(day),zone).toAbsoluteString().replace(".000Z","Z");}
function dateFilters(period:{start:string;end:string},zone:string){const end=parseDate(period.end).add({days:1}).toString();return [`greater-or-equal(datetime,${boundary(period.start,zone)})`,`less-than(datetime,${boundary(end,zone)})`];}
async function aggregate(attributes:Record<string,unknown>){
 const output:Aggregate[]=[];const seen=new Set<string>();let cursor:string|undefined;
 do{
  const page=await request<Aggregate>("https://a.klaviyo.com/api/metric-aggregates/",{data:{type:"metric-aggregate",attributes:{...attributes,...(cursor?{page_cursor:cursor}:{})}}});
  if(!Array.isArray(page.data?.attributes?.data))throw Error("Invalid Klaviyo aggregate report");output.push(page);
  const next=page.links?.next;let newCursor:string|undefined;
  if(next){const parsed=new URL(next);if(parsed.origin!=="https://a.klaviyo.com")throw Error("Invalid Klaviyo pagination");newCursor=parsed.searchParams.get("page[cursor]")??parsed.searchParams.get("page_cursor")??undefined;if(!newCursor||seen.has(newCursor))throw Error("Incomplete Klaviyo aggregate report");seen.add(newCursor);}
  cursor=newCursor;
 }while(cursor);
 return output;
}
function valuesOrThrow(values:number[]|undefined){if(!Array.isArray(values)||values.some(value=>!Number.isFinite(value)||value<0))throw Error("Invalid Klaviyo measurement");return values;}
function sum(values:number[]|undefined){return valuesOrThrow(values).reduce((a,b)=>a+b,0);}
function rows(pages:Aggregate[]){return pages.flatMap(page=>page.data.attributes.data);}
const ratio=(value:number,denominator:number)=>denominator>0?value/denominator:null;

/** Read the same event-time measures used by the dashboard, without old local caches. */
export async function fetchFreshEdmTestingSnapshot(input:TestingPeriodInput={}):Promise<EdmTestingSnapshot>{
 const preset=input.preset??"lastWeek",latest=new Date(Date.now()-86400000).toISOString().slice(0,10),period=resolveTestingPeriod(latest,input);
 const allMetrics=await metrics();
 const definitions=await Promise.all(edmContentTestCampaignIds.map(async id=>{
  const campaign=await request<CampaignDocument>(`https://a.klaviyo.com/api/campaigns/${id}/?include=campaign-messages`);
  const messages=(campaign.included??[]).filter(item=>item.type==="campaign-message").sort((a,b)=>a.id.localeCompare(b.id));
  const related=campaign.data.relationships?.["campaign-messages"]?.data??[];
  if(campaign.data.id!==id||messages.length<2||related.length!==messages.length||related.some(message=>!messages.some(item=>item.id===message.id)))throw Error("Incomplete Klaviyo campaign variations");
  const templates=await Promise.all(messages.map(async message=>{
   const template=await request<{data:{attributes:{html?:string|null}}}>(`https://a.klaviyo.com/api/campaign-messages/${message.id}/template/`);
   if(typeof template.data?.attributes?.html!=="string")throw Error("Klaviyo email template unavailable");
   return template.data.attributes.html;
  }));
  return {campaign,messages,templates};
 }));
 const campaigns:EdmTestCampaign[]=[];const dailyCampaigns:OverviewDailyRow[]=[];
 for(const {campaign,messages,templates} of definitions){
  const id=campaign.data.id,valid=new Set(messages.map(message=>message.id));
  const event:Record<string,EdmEventMetrics>=Object.fromEntries(messages.map(message=>[message.id,{delivered:0,opens:0,clicks:0,orders:0,revenue:0}]));
  for(const name of ["Received Email","Opened Email","Clicked Email","Placed Order"]){
   const conversion=name==="Placed Order",measurements=conversion?["count","sum_value"]:name==="Received Email"?["count"]:["unique"];
   const pages=await aggregate({metric_id:metricId(allMetrics,name),measurements,by:[conversion?"$attributed_variation":"$variation"],interval:"month",timezone:"UTC",filter:[...dateFilters(period,"UTC"),`equals(${conversion?"$attributed_message":"$message"},${JSON.stringify(id)})`]});
   const seen=new Set<string>();
   for(const row of rows(pages)){const key=row.dimensions[0],target=event[key];if(!target)continue;if(seen.has(key))throw Error("Duplicate Klaviyo variation totals");seen.add(key);
    if(conversion){target.orders=sum(row.measurements.count);target.revenue=sum(row.measurements.sum_value);}else if(name==="Received Email")target.delivered=sum(row.measurements.count);else target[name==="Opened Email"?"opens":"clicks"]=singleBucketUniqueRecipients(valuesOrThrow(row.measurements.unique));
   }
  }
  // The warehouse's link fact uses New York calendar days; sum each day's
  // per-variation, per-URL uniques to retain the existing module-click scope.
  const linkPages=await aggregate({metric_id:metricId(allMetrics,"Clicked Email"),measurements:["unique"],by:["$variation","URL"],interval:"day",timezone:"America/New_York",filter:[...dateFilters(period,"America/New_York"),`equals($message,${JSON.stringify(id)})`]});
  const links=new Map<string,Map<string,number>>();
  for(const row of dailyRows(linkPages,["unique"])){const [variation,url]=row.dimensions;if(!valid.has(variation)||typeof url!=="string")continue;const existing=links.get(variation)??new Map<string,number>();existing.set(url,(existing.get(url)??0)+row.measurements.unique);links.set(variation,existing);}
  const tests:EdmTest[]=messages.map((message,index)=>{
   const content=message.attributes.definition?.content??{},value=event[message.id],pattern=edmModulePatterns[id],matches=[...(links.get(message.id)??new Map<string,number>())].filter(([url])=>pattern?.test(url)).map(([url,uniqueClicks])=>({url,uniqueClicks}));
   const clicks=matches.reduce((total,item)=>total+item.uniqueClicks,0);
   return {label:`Test ${String.fromCharCode(65+index)}`,hasData:true,variationId:message.id,fromLabel:content.from_label||`Variation ${index+1}`,subject:content.subject||"—",previewText:content.preview_text||"",html:templates[index],moduleClicks:pattern?clicks:null,moduleLinks:matches,secondModuleClickRate:pattern?ratio(clicks,value.delivered):null,openRate:value.opens==null?null:ratio(value.opens,value.delivered),clickRate:value.clicks==null?null:ratio(value.clicks,value.delivered),orders:value.orders,revenue:value.revenue,delivered:value.delivered,clicks:value.clicks};
  });
  const first=campaign.data.attributes;
  campaigns.push({campaignId:id,campaignName:first.name,campaignStatus:first.status,sendDate:(first.send_time??first.scheduled_at)?.slice(0,10)??null,hasData:true,tests});
  const byDay=new Map<string,OverviewDailyRow>();
  for(const name of ["Received Email","Clicked Email","Placed Order"]){
   const conversion=name==="Placed Order",measurements=conversion?["count","sum_value"]:name==="Received Email"?["count"]:["unique"];
   const pages=await aggregate({metric_id:metricId(allMetrics,name),measurements,by:[conversion?"$attributed_variation":"$variation"],interval:"day",timezone:"UTC",filter:[...dateFilters(period,"UTC"),`equals(${conversion?"$attributed_message":"$message"},${JSON.stringify(id)})`]});
   for(const item of dailyRows(pages,measurements)){const variation=item.dimensions[0];if(!valid.has(variation))continue;const key=`${item.date}:${variation}`;let row=byDay.get(key);if(!row){row={date:item.date,entityId:variation,assetType:"Message",spend:0,revenue:0,orders:0,clicks:0,impressions:0,delivered:0};byDay.set(key,row);}
    if(conversion){row.orders+=item.measurements.count;row.revenue+=item.measurements.sum_value;}else if(name==="Received Email")row.delivered!+=item.measurements.count;else row.clicks+=item.measurements.unique;
   }
  }
  dailyCampaigns.push(...byDay.values());
 }
 const ids=campaigns.map(campaign=>campaign.campaignId);
 const recipientFilter=`any($message,${JSON.stringify(ids)})`;
 const uniquePages=await aggregate({metric_id:metricId(allMetrics,"Received Email"),measurements:["unique"],by:[],interval:"month",timezone:"UTC",filter:[...dateFilters(period,"UTC"),recipientFilter]});
 const uniqueRecipients=singleBucketUniqueRecipients(rows(uniquePages).flatMap(row=>valuesOrThrow(row.measurements.unique)));
 const dailyReach=await aggregate({metric_id:metricId(allMetrics,"Received Email"),measurements:["unique"],by:[],interval:"day",timezone:"UTC",filter:[...dateFilters(period,"UTC"),recipientFilter]});
 const daily:OverviewDailySource={channel:"EDM",rows:dailyCampaigns,reach:dailyRows(dailyReach,["unique"]).map(item=>({date:item.date,value:item.measurements.unique}))};
 const data:EdmTestingData={period,periodLabel:testingPeriodLabels[preset],campaigns,tests:campaigns.flatMap(campaign=>campaign.tests).filter(test=>test.hasData),uniqueRecipients};
 return {data,daily};
}
