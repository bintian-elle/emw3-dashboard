import "server-only";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";

const API = "https://a.klaviyo.com/api";
const CAMPAIGNS = [
  {id:"01M2RCYC6M4WQKYVZWZJGZHV29",modulePattern:/\/collections\/shop-all(?:[?#]|$)/i},
  {id:"01M32R5G4AH5ZCDSA64EVQNTA7",modulePattern:/\/collections\/shop-all(?:[?#]|$)/i},
] as const;
const PLACED_ORDER_METRIC_ID = "SHDwgQ";
const CLICKED_EMAIL_METRIC_ID = "VYRRt4";

type CampaignMessage={id:string;attributes:{definition:{content:{subject:string;preview_text:string;from_label:string}}}};
type Campaign={id:string;attributes:{name:string;status:string};relationships:{"campaign-messages":{data:Array<{id:string}>}}};
type Template={data:{attributes:{html?:string}}};
type ReportRow={groupings:{variation:string};statistics:{delivered?:number;clicks_unique?:number;open_rate?:number;click_rate?:number;conversions?:number;conversion_value?:number}};
type ClickRow={dimensions:[string,string];measurements:{unique:number[]}};

export type EdmTest={label:"Test A"|"Test B";variationId:string;fromLabel:string;subject:string;previewText:string;html:string;secondModuleClickRate:number|null;openRate:number|null;clickRate:number|null;orders:number;revenue:number;delivered:number;clicks:number};
export type EdmTestCampaign={campaignId:string;campaignName:string;campaignStatus:string;tests:EdmTest[]};
export type EdmTestingData={period:{start:string;end:string};periodLabel:string;campaigns:EdmTestCampaign[];tests:EdmTest[]};

function headers(){const apiKey=process.env.KLAVIYO_API_KEY?.trim(),revision=process.env.KLAVIYO_REVISION?.trim()||"2026-07-15";if(!apiKey)throw new Error("KLAVIYO_API_KEY is not configured.");return {Authorization:`Klaviyo-API-Key ${apiKey}`,accept:"application/vnd.api+json","content-type":"application/vnd.api+json",revision};}
async function klaviyo<T>(path:string,init:RequestInit={}):Promise<T>{const response=await fetch(`${API}${path}`,{...init,headers:{...headers(),...(init.headers??{})},next:{revalidate:3600}});if(!response.ok)throw new Error(`Klaviyo API failed (${response.status}): ${(await response.text()).slice(0,300)}`);return response.json() as Promise<T>;}
const iso=(date:Date)=>date.toISOString().slice(0,10);
const nextDay=(value:string)=>{const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+1);return iso(date);};
const ratio=(a:number,b:number)=>b>0?a/b:null;
function templateDetails(html="",modulePattern:RegExp){const links=[...html.matchAll(/href=["']([^"']+)/gi)];return {moduleUrl:links.map(match=>match[1].replaceAll("&amp;","&")).find(url=>modulePattern.test(url))??null};}
async function valuesReport(campaignId:string,period:{start:string;end:string}){const result=await klaviyo<{data:{attributes:{results:ReportRow[]}}}>("/campaign-values-reports",{method:"POST",body:JSON.stringify({data:{type:"campaign-values-report",attributes:{timeframe:{start:`${period.start}T00:00:00Z`,end:`${period.end}T23:59:59Z`},conversion_metric_id:PLACED_ORDER_METRIC_ID,filter:`equals(campaign_id,"${campaignId}")`,statistics:["delivered","clicks_unique","open_rate","click_rate","conversions","conversion_value"],group_by:["campaign_message_id","campaign_id","variation"]}}})});return result.data.attributes.results;}
async function moduleClicks(campaignId:string,period:{start:string;end:string}){const result=await klaviyo<{data:{attributes:{data:ClickRow[]}}}>("/metric-aggregates",{method:"POST",body:JSON.stringify({data:{type:"metric-aggregate",attributes:{metric_id:CLICKED_EMAIL_METRIC_ID,measurements:["unique"],filter:[`greater-or-equal(datetime,${period.start}T00:00:00Z)`,`less-than(datetime,${nextDay(period.end)}T00:00:00Z)`,`equals($message,"${campaignId}")`],by:["$variation","URL"]}}})});return result.data.attributes.data;}

async function campaignTest(campaignId:string,modulePattern:RegExp,period:{start:string;end:string}):Promise<EdmTestCampaign>{
  const campaignResource=await klaviyo<{data:Campaign;included?:CampaignMessage[]}>(`/campaigns/${campaignId}?include=campaign-messages`);
  const messageIds=campaignResource.data.relationships["campaign-messages"].data.map(item=>item.id),messageMap=new Map((campaignResource.included??[]).map(item=>[item.id,item]));
  const [reportRows,clickRows,...templates]=await Promise.all([valuesReport(campaignId,period),moduleClicks(campaignId,period),...messageIds.map(id=>klaviyo<Template>(`/campaign-messages/${id}/template`))]);
  const reportMap=new Map(reportRows.map(row=>[row.groupings.variation,row.statistics]));
  const tests=messageIds.slice(0,2).map((variationId,index)=>{const content=messageMap.get(variationId)?.attributes.definition.content,html=templates[index]?.data.attributes.html??"",details=templateDetails(html,modulePattern),statistics=reportMap.get(variationId),delivered=Number(statistics?.delivered??0);const trackedClicks=details.moduleUrl?clickRows.filter(row=>row.dimensions[0]===variationId&&row.dimensions[1]===details.moduleUrl).reduce((sum,row)=>sum+row.measurements.unique.reduce((total,value)=>total+value,0),0):0;return {label:index===0?"Test A" as const:"Test B" as const,variationId,fromLabel:content?.from_label??`Variation ${index+1}`,subject:content?.subject??"—",previewText:content?.preview_text??"",html,secondModuleClickRate:ratio(trackedClicks,delivered),openRate:statistics?.open_rate??null,clickRate:statistics?.click_rate??null,orders:Number(statistics?.conversions??0),revenue:Number(statistics?.conversion_value??0),delivered,clicks:Number(statistics?.clicks_unique??0)};});
  return {campaignId,campaignName:campaignResource.data.attributes.name,campaignStatus:campaignResource.data.attributes.status,tests};
}

export async function getEdmTestingData(input:TestingPeriodInput={}):Promise<EdmTestingData>{
  await connection();
  const latest=iso(new Date(Date.now()-86_400_000)),preset=input.preset??"lastWeek",period=resolveTestingPeriod(latest,input);
  const campaigns=await Promise.all(CAMPAIGNS.map(campaign=>campaignTest(campaign.id,campaign.modulePattern,period)));
  return {period,periodLabel:testingPeriodLabels[preset],campaigns,tests:campaigns.flatMap(campaign=>campaign.tests)};
}
