import "server-only";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";

const API = "https://a.klaviyo.com/api";
const CAMPAIGN_ID = "01M0STJW7E4J6HVQK42PFP38B9";
const PLACED_ORDER_METRIC_ID = "SHDwgQ";
const CLICKED_EMAIL_METRIC_ID = "VYRRt4";

type CampaignMessage={id:string;attributes:{definition:{content:{subject:string;preview_text:string;from_label:string}}}};
type Campaign={id:string;attributes:{name:string;status:string};relationships:{"campaign-messages":{data:Array<{id:string}>}}};
type Template={data:{attributes:{html?:string}}};
type ReportRow={groupings:{variation:string};statistics:{delivered?:number;clicks_unique?:number;open_rate?:number;click_rate?:number;conversions?:number;conversion_value?:number}};
type ClickRow={dimensions:[string,string];measurements:{unique:number[]}};

export type EdmTest={label:"Test A"|"Test B";variationId:string;fromLabel:string;subject:string;previewText:string;html:string;secondModuleClickRate:number|null;openRate:number|null;clickRate:number|null;orders:number;revenue:number;delivered:number;clicks:number};
export type EdmTestingData={campaignId:string;campaignName:string;campaignStatus:string;period:{start:string;end:string};periodLabel:string;tests:EdmTest[]};

function headers(){const apiKey=process.env.KLAVIYO_API_KEY?.trim(),revision=process.env.KLAVIYO_REVISION?.trim()||"2026-07-15";if(!apiKey)throw new Error("KLAVIYO_API_KEY is not configured.");return {Authorization:`Klaviyo-API-Key ${apiKey}`,accept:"application/vnd.api+json","content-type":"application/vnd.api+json",revision};}
async function klaviyo<T>(path:string,init:RequestInit={}):Promise<T>{const response=await fetch(`${API}${path}`,{...init,headers:{...headers(),...(init.headers??{})},next:{revalidate:3600}});if(!response.ok)throw new Error(`Klaviyo API failed (${response.status}): ${(await response.text()).slice(0,300)}`);return response.json() as Promise<T>;}
const iso=(date:Date)=>date.toISOString().slice(0,10);
const nextDay=(value:string)=>{const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);return iso(date);};
const ratio=(a:number,b:number)=>b>0?a/b:null;
function templateDetails(html=""){const links=[...html.matchAll(/href=["']([^"']+)/gi)];return {moduleUrl:links.map(match=>match[1].replaceAll("&amp;","&")).find(url=>/\/collections\/labordaysale2026(?:#bundles)?(?:[?#]|$)/i.test(url))??null};}
async function valuesReport(period:{start:string;end:string}){const result=await klaviyo<{data:{attributes:{results:ReportRow[]}}}>("/campaign-values-reports",{method:"POST",body:JSON.stringify({data:{type:"campaign-values-report",attributes:{timeframe:{start:`${period.start}T00:00:00Z`,end:`${period.end}T23:59:59Z`},conversion_metric_id:PLACED_ORDER_METRIC_ID,filter:`equals(campaign_id,"${CAMPAIGN_ID}")`,statistics:["delivered","clicks_unique","open_rate","click_rate","conversions","conversion_value"],group_by:["campaign_message_id","campaign_id","variation"]}}})});return result.data.attributes.results;}
async function moduleClicks(period:{start:string;end:string}){const result=await klaviyo<{data:{attributes:{data:ClickRow[]}}}>("/metric-aggregates",{method:"POST",body:JSON.stringify({data:{type:"metric-aggregate",attributes:{metric_id:CLICKED_EMAIL_METRIC_ID,measurements:["unique"],filter:[`greater-or-equal(datetime,${period.start}T00:00:00Z)`,`less-than(datetime,${nextDay(period.end)}T00:00:00Z)`,`equals($message,"${CAMPAIGN_ID}")`],by:["$variation","URL"]}}})});return result.data.attributes.data;}

export async function getEdmTestingData(input:TestingPeriodInput={}):Promise<EdmTestingData>{
  await connection();
  const latest=iso(new Date(Date.now()-86_400_000)),preset=input.preset??"lastWeek",period=resolveTestingPeriod(latest,input);
  const campaignResource=await klaviyo<{data:Campaign;included?:CampaignMessage[]}>(`/campaigns/${CAMPAIGN_ID}?include=campaign-messages`);
  const messageIds=campaignResource.data.relationships["campaign-messages"].data.map(item=>item.id),messageMap=new Map((campaignResource.included??[]).map(item=>[item.id,item]));
  const [reportRows,clickRows,...templates]=await Promise.all([valuesReport(period),moduleClicks(period),...messageIds.map(id=>klaviyo<Template>(`/campaign-messages/${id}/template`))]);
  const reportMap=new Map(reportRows.map(row=>[row.groupings.variation,row.statistics]));
  const tests=messageIds.slice(0,2).map((variationId,index)=>{const content=messageMap.get(variationId)?.attributes.definition.content,html=templates[index]?.data.attributes.html??"",details=templateDetails(html),statistics=reportMap.get(variationId),delivered=Number(statistics?.delivered??0);const moduleClicks=details.moduleUrl?clickRows.filter(row=>row.dimensions[0]===variationId&&row.dimensions[1]===details.moduleUrl).reduce((sum,row)=>sum+row.measurements.unique.reduce((total,value)=>total+value,0),0):0;return {label:index===0?"Test A" as const:"Test B" as const,variationId,fromLabel:content?.from_label??`Variation ${index+1}`,subject:content?.subject??"—",previewText:content?.preview_text??"",html,secondModuleClickRate:ratio(moduleClicks,delivered),openRate:statistics?.open_rate??null,clickRate:statistics?.click_rate??null,orders:Number(statistics?.conversions??0),revenue:Number(statistics?.conversion_value??0),delivered,clicks:Number(statistics?.clicks_unique??0)};});
  return {campaignId:CAMPAIGN_ID,campaignName:campaignResource.data.attributes.name,campaignStatus:campaignResource.data.attributes.status,period,periodLabel:testingPeriodLabels[preset],tests};
}
