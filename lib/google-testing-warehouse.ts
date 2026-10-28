import 'server-only';
import {db} from './db';
import {warehouseCoverage,uncoveredWindows,type WarehouseRun,type DateWindow} from './google-testing-warehouse-contract';

type MetricRow={customer_id:string;campaign_id:string;ad_group_id?:string;ad_id?:string;asset_group_id?:string;asset_id?:string;field_type?:string;date:string;cost_micros:string;conversions:string;conversions_value:string;impressions:string;clicks:string;campaign_name?:string;campaign_status?:string;ad_group_name?:string};
export type WarehouseDailyRow={campaign:{id:string;name?:string;status?:string};adGroup?:{id:string;name?:string};adGroupAd?:{ad:{id:string}};assetGroup?:{id:string};asset?:{id:string};assetGroupAsset?:{fieldType:string};segments:{date:string};metrics:{costMicros:string;conversions:number;conversionsValue:number;impressions:string;clicks:string}};
type Kind='ads'|'pmax-assets';
/** Metric-grain reads only. Inventory, labels and incomplete creative fields retain API discovery. */
export async function googleWarehouseDaily(kind:Kind,ids:string[],start:string,end:string):Promise<{rows:WarehouseDailyRow[];missing:DateWindow[]}>{
 const fallback={rows:[],missing:[{start,end}]};if(!ids.length)return {rows:[],missing:[]};
 const customer=(process.env.GOOGLE_ADS_CUSTOMER_ID??'').replaceAll('-','');if(!/^\d+$/.test(customer))return fallback;
 const resource=kind==='ads'?'ad_group_ad':'asset_group_asset',table=kind==='ads'?'fact_ad_daily':'fact_asset_group_asset_daily',idColumn=kind==='ads'?'ad_id':'asset_group_id';
 try{
  const runs=await db.query<WarehouseRun>(`select query_text,completed_at from etl_run_log where customer_id=$1 and resource_name=$2 and status='SUCCESS' and query_text ilike '%segments.date%' order by completed_at desc limit 2000`,[customer,resource]);
  // Broad extraction is required: a filtered extraction cannot prove other entities had zero activity.
  const safeRuns=runs.rows.filter(run=>run.query_text&&/^\s*segments\.date\s+BETWEEN\s+'\d{4}-\d{2}-\d{2}'\s+AND\s+'\d{4}-\d{2}-\d{2}'\s*;?\s*$/i.test(run.query_text.split(/\bWHERE\b/i)[1]??''));
  const covered=warehouseCoverage(safeRuns,start,end);if(!covered.length)return fallback;
  const result=await db.query<MetricRow>(`select f.*,f.date::text date,c.campaign_name,c.campaign_status${kind==='ads'?',g.ad_group_name':''} from ${table} f join dim_campaign c using(customer_id,campaign_id) ${kind==='ads'?'join dim_ad_group g using(customer_id,campaign_id,ad_group_id)':''} where f.customer_id=$1 and f.${idColumn}=any($2::text[]) and exists(select 1 from jsonb_to_recordset($3::jsonb) as r(start text,"end" text) where f.date between r.start::date and r."end"::date)`,[customer,ids,JSON.stringify(covered)]);
  const rows=result.rows.map(row=>({campaign:{id:row.campaign_id,name:row.campaign_name,status:row.campaign_status},...(kind==='ads'?{adGroup:{id:row.ad_group_id!,name:row.ad_group_name},adGroupAd:{ad:{id:row.ad_id!}}}:{assetGroup:{id:row.asset_group_id!},asset:{id:row.asset_id!},assetGroupAsset:{fieldType:row.field_type!}}),segments:{date:row.date},metrics:{costMicros:row.cost_micros,conversions:Number(row.conversions),conversionsValue:Number(row.conversions_value),impressions:row.impressions,clicks:row.clicks}}));
  return {rows,missing:uncoveredWindows(covered,start,end)};
 }catch(error){
  // No zeros or partial-success publication on DB failure: caller supplements from the API.
  console.warn('Google testing warehouse unavailable; using API for the requested scope.',(error as {code?:string}).code??'query_failed');return fallback;
 }
}
export async function warehouseFirstDaily<T>(kind:Kind,ids:string[],start:string,end:string,fetchMissing:(window:DateWindow)=>Promise<T[]>):Promise<T[]>{
 const stored=await googleWarehouseDaily(kind,ids,start,end),rows=stored.rows as T[];
 for(const window of stored.missing)rows.push(...await fetchMissing(window));
 return rows;
}

/** AI's morning batch must wait for today's complete ad and asset extraction jobs. */
export async function assertGoogleWarehouseUpdatedToday(now=new Date()){
 const customer=(process.env.GOOGLE_ADS_CUSTOMER_ID??'').replaceAll('-','');
 const result=await db.query<{resource_name:string;completed:Date}>(`select resource_name,max(completed_at) completed from etl_run_log where customer_id=$1 and resource_name=any($2::text[]) and status='SUCCESS' and query_text ilike '%segments.date%' group by resource_name`,[customer,['ad_group_ad','asset_group_asset']]);
 const day=(date:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 if(['ad_group_ad','asset_group_asset'].some(resource=>!result.rows.some(row=>row.resource_name===resource&&day(new Date(row.completed))===day(now))))throw Error('Google warehouse has not completed today’s ad and asset refresh.');
}
