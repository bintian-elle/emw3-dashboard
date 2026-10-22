import {createHash} from 'node:crypto';
import pg from 'pg';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function nameTestingAds(payload,periods){
 const aliases=new Map(),labels=new Map();
 for(const period of periods)for(const test of period.tests??[]){
  if(!['Meta','Reddit'].includes(test.channel))continue;
  for(const ad of test.ad_performance??[]){
   if(!ad.adId||!ad.name)continue;
   const name=ad.name,short=name.match(/(?:^|_)(Video\d+|Image\d+)(?:_|$)/i)?.[1];
   aliases.set(String(ad.adId),short?`${short} — ${name}`:name);
   if(short){const names=labels.get(short)??new Set();names.add(name);labels.set(short,names);}
  }
 }
 const rewrite=text=>{
  if(text.startsWith('[FRAMEWORK] '))return text;
  return text.split(/(https?:\/\/\S+)/g).map(part=>{
   if(/^https?:\/\//.test(part))return part;
   part=part.replace(/\b(?:Ad\s+)?(\d{10,})\b/g,(original,id)=>aliases.get(id)??original);
   for(const [label,names] of labels)if(names.size===1){const name=[...names][0];part=part.replace(new RegExp(`\\b${label}\\b(?!\\s*[—(])`,'g'),`${label} — ${name}`);}
   return part.replace(/\bscoped spend was\b/gi,'total testing spend was').replace(/\bdisplayed reach\b/gi,'Total Reach').replace(/\boverall displayed CTR\b/gi,'overall CTR');
  }).join('');
 };
 const visit=value=>typeof value==='string'?rewrite(value):Array.isArray(value)?value.map(visit):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,['test_id','campaign_name','generation_job_id'].includes(key)?item:visit(item)])):value;
 return visit(payload);
}
/** Source-backed name formatting only; never recomputes or invents analysis. */
export async function normalizeTestingReadoutNames(jobId){
 if(!jobId)return;
 const pool=new pg.Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},max:1,connectionTimeoutMillis:12000});
 const client=await pool.connect();
 try{
  await client.query('begin');
  const job=(await client.query('select body from ai_job_queue where id=$1',[jobId])).rows[0];
  if(!job){await client.query('rollback');return;}
  const periods=job.body.analysis_payload?.periods??[];
  const {rows}=await client.query("select cache_key,payload from testing_ai_readout_cache where payload->>'generation_job_id'=$1 and readout_type='period' and cache_key not like 'period:concluded:%' for update",[jobId]);
  for(const row of rows){
   const originalHash=hash(row.payload),updated=nameTestingAds(row.payload,periods);
   if(hash(updated)===originalHash)continue;
   const translation=(await client.query("select source_hash,payload from testing_ai_readout_translations where cache_key=$1 and language='zh' for update",[row.cache_key])).rows[0];
   if(!translation||translation.source_hash!==originalHash)throw Error(`Matching Chinese translation is not ready for ${row.cache_key}`);
   await client.query('update testing_ai_readout_cache set payload=$2::jsonb where cache_key=$1',[row.cache_key,JSON.stringify(updated)]);
   await client.query("update testing_ai_readout_translations set source_hash=$2,payload=$3::jsonb where cache_key=$1 and language='zh'",[row.cache_key,hash(updated),JSON.stringify(nameTestingAds(translation.payload,periods))]);
  }
  await client.query('commit');
 }catch(error){await client.query('rollback');throw error;}finally{client.release();await pool.end();}
}
