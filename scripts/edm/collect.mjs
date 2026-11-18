import {createHash} from 'node:crypto';
import {parseDate} from '@internationalized/date';
import {days,timeframe,aggregateRows,flowRows,campaignRows,statistics,replaceSlice,localDay,mergeCoverage} from './model.mjs';

export const domains=['metrics','flows','campaigns','links','subscribers'];
const metricNames=['Bounced Email','Clicked Email','Clicked Text Message','Marked Email as Spam','Opened Email','Placed Order','Received Email','Sent Text Message','Subscribed to Email Marketing','Subscribed to Text Messaging Marketing','Unsubscribed from Email Marketing','Unsubscribed from Text Messaging Marketing'];
const allowedDimensions=new Set(['dim_campaign','dim_campaign_message','dim_flow','dim_flow_message','dim_email_template','dim_email_creative','dim_creative_asset']);
export async function upsert(db,table,rows,keys){
 if(!allowedDimensions.has(table))throw Error('Invalid EDM dimension');
 for(const row of rows){const fields=Object.keys(row);if(fields.some(f=>!/^[a-z_]+$/.test(f)))throw Error('Invalid EDM field');const updates=fields.filter(f=>!keys.includes(f)).map(f=>`${f}=EXCLUDED.${f}`);await db.query(`INSERT INTO ${table} (${fields.join(',')}) VALUES (${fields.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT (${keys.join(',')}) DO UPDATE SET ${updates.join(',')},updated_at=now()`,Object.values(row));}
}
export async function setup(db){
 await db.query(`CREATE TABLE IF NOT EXISTS edm_refresh_coverage (domain text PRIMARY KEY,start_day date NOT NULL,end_day date NOT NULL,updated_at timestamptz NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS edm_refresh_runs (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,started_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,status text NOT NULL,range_start date,range_end date,details jsonb NOT NULL DEFAULT '{}'::jsonb);`);
 await db.query(`INSERT INTO edm_refresh_coverage(domain,start_day,end_day) SELECT unnest($1::text[]),'2026-11-10'::date,'2026-11-10'::date ON CONFLICT DO NOTHING`,[domains]);
}
function attrs(message){const a=message.attributes??{},c=a.definition?.content??{};return{campaign_message_id:message.id,campaign_message_name:a.label??a.name??null,send_channel:a.channel??a.definition?.channel??null,subject:c.subject??null,subject_line:c.subject??null,preview_text:c.preview_text??null,from_label:c.from_label??null,from_email:c.from_email??null};}
async function metadata(db,api,start){
 const pages=[];for(const channel of ['email','sms'])pages.push(...await api.pages('/api/campaigns/?'+new URLSearchParams({filter:`equals(messages.channel,"${channel}")`,include:'campaign-messages'})));const campaigns=pages.flatMap(p=>{if(!Array.isArray(p.data))throw Error('Invalid campaign list');return p.data;}),included=pages.flatMap(p=>p.included??[]);const byMessage=new Map(included.map(m=>[m.id,m]));
 for(const c of campaigns){const a=c.attributes;await upsert(db,'dim_campaign',[{campaign_id:c.id,campaign_name:a.name,status:a.status,channel:a.channel??null,send_strategy:JSON.stringify(a.send_strategy??null),send_time:a.send_time??null,scheduled_at:a.scheduled_at??null,created_at_klaviyo:a.created_at??null,updated_at_klaviyo:a.updated_at??null}],['campaign_id']);
  for(const ref of c.relationships?.['campaign-messages']?.data??[]){let m=byMessage.get(ref.id);if(!m)m=(await api.request(`/api/campaign-messages/${ref.id}/`)).data;const mapped={...attrs(m),campaign_id:c.id};
   const old=(await db.query('SELECT template_id,updated_at_klaviyo FROM dim_campaign_message WHERE campaign_message_id=$1',[ref.id])).rows[0];
   await upsert(db,'dim_campaign_message',[mapped],['campaign_message_id']);
   if(mapped.send_channel!=='sms'&&a.send_time&&localDay(a.send_time)>=start&&(!old?.template_id||m.attributes?.updated_at&&new Date(m.attributes.updated_at)>new Date(old?.updated_at_klaviyo??0))){
    const t=(await api.request(`/api/campaign-messages/${ref.id}/template/`)).data;
    await upsert(db,'dim_email_template',[{template_id:t.id,template_name:t.attributes.name??null,editor_type:t.attributes.editor_type??null}],['template_id']);
    await db.query('UPDATE dim_campaign_message SET template_id=$2,updated_at_klaviyo=$3 WHERE campaign_message_id=$1',[ref.id,t.id,m.attributes?.updated_at??a.updated_at??null]);
    const html=t.attributes.html;if(typeof html==='string'){
     let index=0;const images=[];const decode=s=>s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
     for(const match of html.matchAll(/<img\b[^>]*>/gi)){const attr={};for(const a of match[0].matchAll(/([\w-]+)\s*=\s*(["'])(.*?)\2/gs))attr[a[1].toLowerCase()]=decode(a[3]);if(!attr.src||!/^https?:\/\//.test(attr.src))continue;const before=html.slice(0,match.index),open=before.lastIndexOf('<a '),close=before.lastIndexOf('</a>');const link=open>close?before.slice(open).match(/href\s*=\s*(["'])(.*?)\1/is)?.[2]:null;const id=createHash('sha256').update(attr.src).digest('hex');await upsert(db,'dim_creative_asset',[{asset_id:id,image_url:attr.src,alt_text:attr.alt??null}],['asset_id']);images.push({template_id:t.id,block_id:String(index++),block_type:'image',asset_id:id,image_url:attr.src,destination_url:link?decode(link):null,alt_text:attr.alt??null});}
     if(images.length)await upsert(db,'dim_email_creative',images,['template_id','block_id']);
    }
   }
  }
 }
 const flows=await api.list('/api/flows/');for(const f of flows)await upsert(db,'dim_flow',[{flow_id:f.id,flow_name:f.attributes.name,status:f.attributes.status,trigger_type:f.attributes.trigger_type??null,created_at_klaviyo:f.attributes.created??null,updated_at_klaviyo:f.attributes.updated??null}],['flow_id']);
 return new Map((await db.query('SELECT campaign_id,send_time FROM dim_campaign')).rows.map(c=>[c.campaign_id,c]));
}
function rangeRows(rows,start,end){return rows.filter(r=>r.date>=start&&r.date<end);}
async function coverage(db,domain,start,end){const previous=(await db.query('SELECT start_day::text start,end_day::text "end" FROM edm_refresh_coverage WHERE domain=$1',[domain])).rows[0];const merged=mergeCoverage(previous,{start,end});await db.query(`INSERT INTO edm_refresh_coverage(domain,start_day,end_day) VALUES($1,$2,$3) ON CONFLICT(domain) DO UPDATE SET start_day=excluded.start_day,end_day=excluded.end_day,updated_at=now()`,[domain,merged.start,merged.end]);}
export async function collect(db,api,{start,end,onProgress=()=>{},resume=false,force=[]}){
 if(force.some(d=>!domains.includes(d)))throw Error('Invalid EDM refresh domain');
 const requested=days(start,end),frame=timeframe(start,end),filters=[`greater-or-equal(datetime,${frame.start})`,`less-than(datetime,${frame.end})`];await api.verify();await setup(db);const campaignMap=await metadata(db,api,start);const metricList=await api.list('/api/metrics/');
 const metric=name=>{const m=metricList.find(m=>m.attributes.name===name&&m.attributes.integration?.key===(name==='Placed Order'?'shopify':'klaviyo'));if(!m)throw Error(`Required EDM metric missing: ${name}`);return m.id;};
 if(metric('Placed Order')!==process.env.EDM_CONVERSION_METRIC_ID)throw Error('EDM conversion metric binding mismatch');
 const outcomes={};
 async function task(domain,work){try{
  const cached=resume&&!force.includes(domain)?(await db.query(`SELECT 1 FROM edm_refresh_coverage WHERE domain=$1 AND start_day<=$2::date AND end_day>=$3::date AND updated_at>=date_trunc('day',now() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York'`,[domain,start,end])).rowCount:0;
  if(cached)outcomes[domain]={ok:true,reused:true};else{const count=await work();await coverage(db,domain,start,end);outcomes[domain]={ok:true,rows:count};}
 }catch(error){outcomes[domain]={ok:false,error:safeError(error)};}onProgress({domain,...outcomes[domain]});}
 const aggregate=(attributes)=>api.pages('/api/metric-aggregates/',{data:{type:'metric-aggregate',attributes}});
 await task('metrics',async()=>{
  const rows=[];
  for(const name of metricNames){const measurements=name==='Placed Order'?['count','unique','sum_value']:['count','unique'];const pages=await aggregate({metric_id:metric(name),measurements,interval:'day',timezone:'US/Eastern',by:[],filter:filters});const daily=rangeRows(aggregateRows(pages,measurements),start,end);if(daily.length!==requested.length||daily.some(r=>r.dimensions.length))throw Error('Incomplete daily metric coverage');for(const r of daily)rows.push({metric_id:metric(name),metric_name:name,date:r.date,count_value:r.count,unique_value:r.unique,sum_value:r.sum_value??null});}
  await replaceSlice(db,'fact_metric_daily','date',start,end,rows);return rows.length;
 });
 await task('flows',async()=>{
  let count=0;
  // Values per complete local day avoid UTC series buckets splitting Eastern days.
  for(const date of requested){const next=parseDate(date).add({days:1}).toString();const pages=await api.pages('/api/flow-values-reports/',{data:{type:'flow-values-report',attributes:{statistics,timeframe:timeframe(date,next),conversion_metric_id:metric('Placed Order'),group_by:['flow_id','flow_message_id','flow_name','flow_message_name','send_channel','variation','variation_name']}}});
   for(const p of pages)for(const r of p.data.attributes.results??[]){const g=r.groupings;if(g?.flow_id&&g.flow_message_id)await upsert(db,'dim_flow_message',[{flow_message_id:g.flow_message_id,flow_id:g.flow_id,flow_name:g.flow_name??null,message_name:g.flow_message_name??null,send_channel:g.send_channel??null}],['flow_message_id']);}
   const rows=flowRows(pages,statistics,date);await replaceSlice(db,'fact_flow_daily','date',date,next,rows);count+=rows.length;
  }return count;
 });
 await task('campaigns',async()=>{const pages=await api.pages('/api/campaign-values-reports/',{data:{type:'campaign-values-report',attributes:{statistics,timeframe:frame,conversion_metric_id:metric('Placed Order'),group_by:['campaign_id','campaign_message_id','send_channel','variation','variation_name']}}});const rows=campaignRows(pages,campaignMap);await replaceSlice(db,'fact_campaign_performance','send_date',start,end,rows);return rows.length;});
 await task('links',async()=>{
  const pages=await aggregate({metric_id:metric('Clicked Email'),measurements:['count','unique'],interval:'day',timezone:'US/Eastern',filter:filters,by:['$message','$variation','URL']});const messageCampaign=new Map((await db.query('SELECT campaign_message_id,campaign_id FROM dim_campaign_message')).rows.map(r=>[r.campaign_message_id,r.campaign_id]));const messageFlows=new Map((await db.query('SELECT flow_message_id,flow_id FROM dim_flow_message')).rows.map(r=>[r.flow_message_id,r.flow_id]));const rows=[];
  for(const r of rangeRows(aggregateRows(pages,['count','unique']),start,end)){const [message,variation,url]=r.dimensions;if(typeof message!=='string'||typeof url!=='string')throw Error('Invalid click identity');const campaign=campaignMap.has(message)?message:messageCampaign.get(message),flow=messageFlows.get(message);const source=campaign?'campaign':flow?'flow':'unknown';const campaignMessage=campaign?(messageCampaign.has(variation)?variation:messageCampaign.has(message)?message:null):null;rows.push({message_key:`${source}:${message}:${variation??''}`,date:r.date,link_url:url,total_clicks:r.count,unique_clicks:r.unique,campaign_id:campaign??null,campaign_message_id:campaignMessage,variation_id:variation??'',source_type:source,flow_id:flow??null,flow_message_id:flow?message:null,source_message_id:message});}
  await replaceSlice(db,'fact_email_link_daily','date',start,end,rows);return rows.length;
 });
 await task('subscribers',async()=>{
  const email=process.env.EDM_EMAIL_SUBSCRIBERS_SEGMENT_ID,sms=process.env.EDM_SMS_SUBSCRIBERS_SEGMENT_ID;if(!email||!sms)throw Error('EDM subscriber segment binding missing');
  const pages=await api.pages('/api/segment-series-reports/',{data:{type:'segment-series-report',attributes:{statistics:['total_members'],timeframe:{start:start+'T00:00:00Z',end:end+'T00:00:00Z'},interval:'daily',filter:`any(segment_id,${JSON.stringify([email,sms])})`}}});const values=new Map();
  for(const p of pages){const a=p.data.attributes;if(!Array.isArray(a.date_times)||!Array.isArray(a.results))throw Error('Incomplete subscriber report');for(const r of a.results){const id=r.groupings?.segment_id;if(![email,sms].includes(id))throw Error('Unexpected subscriber segment');const v=r.statistics?.total_members;if(!Array.isArray(v)||v.length!==a.date_times.length)throw Error('Incomplete subscriber series');for(let i=0;i<v.length;i++){const date=String(a.date_times[i]).slice(0,10);if(date<start||date>=end)continue;if(!Number.isSafeInteger(v[i])||v[i]<0||values.has(`${date}:${id}`))throw Error('Invalid subscriber count');values.set(`${date}:${id}`,v[i]);}}}
  const rows=requested.map(date=>{const e=values.get(`${date}:${email}`),s=values.get(`${date}:${sms}`);if(e===undefined||s===undefined)throw Error('Missing subscriber day');return{date,email_subscribers:e,sms_subscribers:s};});await replaceSlice(db,'fact_subscriber_daily','date',start,end,rows);return rows.length;
 });
 return outcomes;
}
export function safeError(error){const message=String(error?.message??'');const status=message.match(/Klaviyo HTTP (\d{3})/);if(status)return `Klaviyo HTTP ${status[1]}`;if(/timeout|timed out/i.test(message))return 'request_timeout';if(/^[A-Z0-9]{5}$/.test(error?.code??''))return `database_${error.code}`;return message.replace(/https?:\/\/\S+|pk_[A-Za-z0-9_-]+|postgres(?:ql)?:\S+/g,'[redacted]').slice(0,200);}
