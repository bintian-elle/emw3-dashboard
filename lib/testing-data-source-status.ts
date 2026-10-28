import 'server-only';
import {Pool} from 'pg';
import type {TestingDataChannel} from './testing-data-cache-contract';
import {edmContentTestCampaignIds} from './edm-content-testing-scope';
import {GOOGLE_CONTENT_CAMPAIGNS} from './google-content-testing-scope';
let emailPool:Pool|undefined;
/** Timestamp of the relevant warehouse rows, separate from the shared API snapshot time. */
export async function testingDatabaseSyncTime(channel:TestingDataChannel):Promise<string|null>{
 try{
  if(channel==='google-search'){
   const {db}=await import('@/lib/db');
   const result=await db.query<{updated:Date|null}>(`select max(f.updated_at) updated from fact_ad_daily f join dim_campaign c using(customer_id,campaign_id) where c.campaign_name=any($1::text[])`,[GOOGLE_CONTENT_CAMPAIGNS]);
   return result.rows[0]?.updated?new Date(result.rows[0].updated).toISOString():null;
  }
  if(channel==='edm'){
   const connectionString=process.env.KLAVIYO_DATABASE_URL?.trim();if(!connectionString)return null;
   emailPool??=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:2,connectionTimeoutMillis:5000});
   const result=await emailPool.query<{updated:Date|null}>('select max(updated_at) updated from fact_email_link_daily where campaign_id=any($1::text[])',[edmContentTestCampaignIds]);
   return result.rows[0]?.updated?new Date(result.rows[0].updated).toISOString():null;
  }
 }catch{/* Missing database metadata is not a data-refresh success. */}
 return null;
}
