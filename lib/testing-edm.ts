import "server-only";
import {edmEventPerformance} from "@/lib/edm-event-performance";
import {edmUniqueRecipients} from "@/lib/edm-unique-recipients";
import { Pool } from "pg";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";

// Confirmed EDM content test: sent September 18, 2026.
const EDM_CONTENT_TEST_CAMPAIGN_IDS = ["01M2RCYC6M4WQKYVZWZJGZHV29"];

// Module-two mapping is confirmed only for these historical tests.
const MODULE_PATTERNS:Record<string,RegExp>={
 "01M2RCYC6M4WQKYVZWZJGZHV29":/\/collections\/shop-all(?:[?#]|$)/i,
 "01M32R5G4AH5ZCDSA64EVQNTA7":/\/collections\/shop-all(?:[?#]|$)/i,
};

type MessageRow={
  campaign_id:string;campaign_name:string;campaign_status:string;campaign_message_id:string;
  from_label:string|null;subject:string|null;preview_text:string|null;send_date:string|null;
};
type LinkRow={campaign_message_id:string;link_url:string;unique_clicks:string|number};
type CreativeRow={campaign_message_id:string;image_url:string|null;destination_url:string|null;alt_text:string|null};

export type EdmTest={label:string;hasData:boolean;variationId:string;fromLabel:string;subject:string;previewText:string;html:string;moduleContent?:Array<{image_url:string|null;destination_url:string|null;alt_text:string|null}>;moduleClicks?:number|null;moduleLinks?:Array<{url:string;uniqueClicks:number}>;secondModuleClickRate:number|null;openRate:number|null;clickRate:number|null;orders:number;revenue:number;delivered:number;clicks:number|null};
export type EdmTestCampaign={campaignId:string;campaignName:string;campaignStatus:string;sendDate:string|null;hasData:boolean;tests:EdmTest[]};
export type EdmTestingData={period:{start:string;end:string};periodLabel:string;campaigns:EdmTestCampaign[];tests:EdmTest[];uniqueRecipients:number|null};

let pool:Pool|undefined;
function database(){
  const connectionString=process.env.KLAVIYO_DATABASE_URL?.trim();
  if(!connectionString)throw new Error("KLAVIYO_DATABASE_URL is not configured.");
  pool??=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:3,idleTimeoutMillis:30_000,connectionTimeoutMillis:12_000});
  return pool;
}

const iso=(value:Date)=>value.toISOString().slice(0,10);
const n=(value:string|number|null|undefined)=>Number(value??0);
const ratio=(numerator:number,denominator:number)=>denominator>0?numerator/denominator:null;
const escapeHtml=(value:string)=>value.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;").replaceAll(">","&gt;");
function previewHtml(rows:CreativeRow[]){
  const images=rows.filter((row):row is CreativeRow&{image_url:string}=>Boolean(row.image_url));
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;font-family:Arial,sans-serif"><main style="max-width:680px;margin:auto;background:white">${images.map(row=>`<a href="${escapeHtml(row.destination_url||"#")}" style="display:block"><img src="${escapeHtml(row.image_url)}" alt="${escapeHtml(row.alt_text||"")}" style="display:block;width:100%;height:auto"></a>`).join("")}</main></body></html>`;
}

async function campaignTest(campaignId:string,modulePattern:RegExp|undefined,period:{start:string;end:string}):Promise<EdmTestCampaign|null>{
  const client=await database().connect();
  try{
    await client.query("begin transaction read only");
    const messages=await client.query<MessageRow>(`
      select c.campaign_id,c.campaign_name,c.status campaign_status,m.campaign_message_id,
        m.from_label,coalesce(m.subject_line,m.subject) subject,m.preview_text,
        coalesce(c.send_time::date,c.scheduled_at::date)::text send_date
      from dim_campaign c
      join dim_campaign_message m on m.campaign_id=c.campaign_id
      where c.campaign_id=$1
      order by m.campaign_message_id`,[campaignId]);
    if(!messages.rowCount){await client.query("commit");return null}
    const messageIds=messages.rows.map(row=>row.campaign_message_id);
    const [links,creative,eventMetrics]=await Promise.all([
      client.query<LinkRow>(`select campaign_message_id,link_url,sum(unique_clicks) unique_clicks from fact_email_link_daily where campaign_message_id=any($1::text[]) and date between $2::date and $3::date group by campaign_message_id,link_url`,[messageIds,period.start,period.end]),
      client.query<CreativeRow>(`select m.campaign_message_id,coalesce(a.image_url,e.image_url) image_url,e.destination_url,e.alt_text from dim_campaign_message m left join dim_email_creative e on e.template_id=m.template_id left join dim_creative_asset a on a.asset_id=e.asset_id where m.campaign_message_id=any($1::text[]) order by m.campaign_message_id,e.block_id`,[messageIds]),
      edmEventPerformance(campaignId,messageIds,period),
    ]);
    await client.query("commit");
    const tests=messages.rows.map((row,index)=>{
      const event=eventMetrics[row.campaign_message_id];
      const {delivered,clicks,opens}=event;
      const moduleClicks=links.rows.filter(link=>link.campaign_message_id===row.campaign_message_id&&modulePattern?.test(link.link_url)).reduce((sum,link)=>sum+n(link.unique_clicks),0);
      return{label:`Test ${String.fromCharCode(65+index)}`,hasData:true,variationId:row.campaign_message_id,fromLabel:row.from_label||`Variation ${index+1}`,subject:row.subject||"—",previewText:row.preview_text||"",html:previewHtml(creative.rows.filter(item=>item.campaign_message_id===row.campaign_message_id)),moduleContent:creative.rows.filter(item=>item.campaign_message_id===row.campaign_message_id),moduleClicks:modulePattern?moduleClicks:null,moduleLinks:links.rows.filter(link=>link.campaign_message_id===row.campaign_message_id&&modulePattern?.test(link.link_url)).map(link=>({url:link.link_url,uniqueClicks:n(link.unique_clicks)})),secondModuleClickRate:modulePattern?ratio(moduleClicks,delivered):null,openRate:opens==null?null:ratio(opens,delivered),clickRate:clicks==null?null:ratio(clicks,delivered),orders:event.orders,revenue:event.revenue,delivered,clicks};
    });
    const first=messages.rows[0];
    return{campaignId:first.campaign_id,campaignName:first.campaign_name,campaignStatus:first.campaign_status,sendDate:first.send_date,hasData:tests.some(test=>test.hasData),tests};
  }catch(error){await client.query("rollback").catch(()=>{});throw error}
  finally{client.release()}
}

export async function getEdmTestingData(input:TestingPeriodInput={}):Promise<EdmTestingData>{
  await connection();
  const latest=iso(new Date(Date.now()-86_400_000)),preset=input.preset??"lastWeek",period=resolveTestingPeriod(latest,input);
  const selected=await database().query<{campaign_id:string}>(`
    select c.campaign_id from dim_campaign c
    where c.channel='email' and c.send_strategy='ab_test_campaign'
      and c.campaign_id=any($1::text[])
      and (select count(*) from dim_campaign_message m where m.campaign_id=c.campaign_id)>=2
    order by coalesce(c.send_time,c.scheduled_at) desc nulls last,c.campaign_id`,[EDM_CONTENT_TEST_CAMPAIGN_IDS]);
  const campaigns=(await Promise.all(selected.rows.map(campaign=>campaignTest(campaign.campaign_id,MODULE_PATTERNS[campaign.campaign_id],period)))).filter((campaign):campaign is EdmTestCampaign=>Boolean(campaign));
  const uniqueRecipients=await edmUniqueRecipients(period,campaigns.filter(campaign=>campaign.hasData).map(campaign=>campaign.campaignId));
  return{uniqueRecipients,period,periodLabel:testingPeriodLabels[preset],campaigns,tests:campaigns.flatMap(campaign=>campaign.tests).filter(test=>test.hasData)};
}
