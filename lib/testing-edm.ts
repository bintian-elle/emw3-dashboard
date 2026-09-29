import "server-only";
import { Pool } from "pg";
import { connection } from "next/server";
import { resolveTestingPeriod, testingPeriodLabels, type TestingPeriodInput } from "@/lib/testing-google";

const CAMPAIGNS = [
  {id:"01M2RCYC6M4WQKYVZWZJGZHV29",modulePattern:/\/collections\/shop-all(?:[?#]|$)/i},
  {id:"01M32R5G4AH5ZCDSA64EVQNTA7",modulePattern:/\/collections\/shop-all(?:[?#]|$)/i},
] as const;

type MessageRow={
  campaign_id:string;campaign_name:string;campaign_status:string;campaign_message_id:string;
  from_label:string|null;subject:string|null;preview_text:string|null;delivered:string|number|null;
  opens_unique:string|number|null;clicks_unique:string|number|null;conversions:string|number|null;
  conversion_value:string|number|null;
};
type LinkRow={campaign_message_id:string;link_url:string;unique_clicks:string|number};
type CreativeRow={campaign_message_id:string;image_url:string|null;destination_url:string|null;alt_text:string|null};

export type EdmTest={label:"Test A"|"Test B";variationId:string;fromLabel:string;subject:string;previewText:string;html:string;secondModuleClickRate:number|null;openRate:number|null;clickRate:number|null;orders:number;revenue:number;delivered:number;clicks:number};
export type EdmTestCampaign={campaignId:string;campaignName:string;campaignStatus:string;tests:EdmTest[]};
export type EdmTestingData={period:{start:string;end:string};periodLabel:string;campaigns:EdmTestCampaign[];tests:EdmTest[]};

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

async function campaignTest(campaignId:string,modulePattern:RegExp,period:{start:string;end:string}):Promise<EdmTestCampaign|null>{
  const client=await database().connect();
  try{
    await client.query("begin transaction read only");
    const messages=await client.query<MessageRow>(`
      select c.campaign_id,c.campaign_name,c.status campaign_status,m.campaign_message_id,
        m.from_label,coalesce(m.subject_line,m.subject) subject,m.preview_text,
        coalesce(sum(p.delivered),0) delivered,coalesce(sum(p.opens_unique),0) opens_unique,
        coalesce(sum(p.clicks_unique),0) clicks_unique,coalesce(sum(p.conversions),0) conversions,
        coalesce(sum(p.conversion_value),0) conversion_value
      from dim_campaign c
      join dim_campaign_message m on m.campaign_id=c.campaign_id
      left join fact_campaign_performance p on p.campaign_message_id=m.campaign_message_id
        and p.send_date between $2::date and $3::date
      where c.campaign_id=$1
      group by c.campaign_id,c.campaign_name,c.status,m.campaign_message_id,m.from_label,m.subject_line,m.subject,m.preview_text
      order by m.campaign_message_id`,[campaignId,period.start,period.end]);
    if(!messages.rowCount){await client.query("commit");return null}
    const messageIds=messages.rows.map(row=>row.campaign_message_id);
    const [links,creative]=await Promise.all([
      client.query<LinkRow>(`select campaign_message_id,link_url,sum(unique_clicks) unique_clicks from fact_email_link_daily where campaign_message_id=any($1::text[]) and date between $2::date and $3::date group by campaign_message_id,link_url`,[messageIds,period.start,period.end]),
      client.query<CreativeRow>(`select m.campaign_message_id,coalesce(a.image_url,e.image_url) image_url,e.destination_url,e.alt_text from dim_campaign_message m left join dim_email_creative e on e.template_id=m.template_id left join dim_creative_asset a on a.asset_id=e.asset_id where m.campaign_message_id=any($1::text[]) order by m.campaign_message_id,e.block_id`,[messageIds]),
    ]);
    await client.query("commit");
    const tests=messages.rows.slice(0,2).map((row,index)=>{
      const delivered=n(row.delivered),clicks=n(row.clicks_unique),opens=n(row.opens_unique);
      const moduleClicks=links.rows.filter(link=>link.campaign_message_id===row.campaign_message_id&&modulePattern.test(link.link_url)).reduce((sum,link)=>sum+n(link.unique_clicks),0);
      return{label:index===0?"Test A" as const:"Test B" as const,variationId:row.campaign_message_id,fromLabel:row.from_label||`Variation ${index+1}`,subject:row.subject||"—",previewText:row.preview_text||"",html:previewHtml(creative.rows.filter(item=>item.campaign_message_id===row.campaign_message_id)),secondModuleClickRate:ratio(moduleClicks,delivered),openRate:ratio(opens,delivered),clickRate:ratio(clicks,delivered),orders:n(row.conversions),revenue:n(row.conversion_value),delivered,clicks};
    });
    const first=messages.rows[0];
    return{campaignId:first.campaign_id,campaignName:first.campaign_name,campaignStatus:first.campaign_status,tests};
  }catch(error){await client.query("rollback").catch(()=>{});throw error}
  finally{client.release()}
}

export async function getEdmTestingData(input:TestingPeriodInput={}):Promise<EdmTestingData>{
  await connection();
  const latest=iso(new Date(Date.now()-86_400_000)),preset=input.preset??"lastWeek",period=resolveTestingPeriod(latest,input);
  const campaigns=(await Promise.all(CAMPAIGNS.map(campaign=>campaignTest(campaign.id,campaign.modulePattern,period)))).filter((campaign):campaign is EdmTestCampaign=>Boolean(campaign));
  return{period,periodLabel:testingPeriodLabels[preset],campaigns,tests:campaigns.flatMap(campaign=>campaign.tests)};
}
