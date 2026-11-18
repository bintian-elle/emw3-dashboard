import {parseDate,toZoned} from '@internationalized/date';
const zone='America/New_York';
export const statistics=['recipients','delivered','opens','opens_unique','clicks','clicks_unique','conversions','conversion_uniques','conversion_value','bounced','failed','unsubscribes','unsubscribe_uniques','spam_complaints'];
export function days(start,end){parseDate(start);parseDate(end);if(start>=end)throw Error('Invalid EDM date window');const result=[];for(let d=parseDate(start);d.toString()<end;d=d.add({days:1}))result.push(d.toString());if(result.length>366)throw Error('EDM date window too large');return result;}
export function timeframe(start,end){days(start,end);return{start:toZoned(parseDate(start),zone).toAbsoluteString(),end:toZoned(parseDate(end),zone).toAbsoluteString()};}
export function mergeCoverage(previous,next){days(next.start,next.end);if(!previous)return next;if(next.start>previous.end||next.end<previous.start)throw Error('Uncollected gap in EDM coverage');return{start:[previous.start,next.start].sort()[0],end:[previous.end,next.end].sort().at(-1)};}
export function localDay(value){const date=new Date(value);if(!Number.isFinite(date.getTime()))throw Error('Missing or invalid send date');return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
function number(value){if(value===null)return null;if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Invalid or missing Klaviyo measurement');return value;}
export function aggregateRows(pages,measurements){
 const out=[],seen=new Set();
 for(const page of pages){const a=page.data?.attributes;if(!Array.isArray(a?.dates)||!Array.isArray(a.data))throw Error('Incomplete aggregate response');
  for(const row of a.data){if(!Array.isArray(row.dimensions))throw Error('Invalid aggregate dimensions');for(const m of measurements)if(!Array.isArray(row.measurements?.[m])||row.measurements[m].length!==a.dates.length)throw Error('Missing aggregate measurement');
   for(let i=0;i<a.dates.length;i++){const date=String(a.dates[i]).slice(0,10);parseDate(date);const key=JSON.stringify([date,row.dimensions]);if(seen.has(key))throw Error('Duplicate aggregate day');seen.add(key);out.push({date,dimensions:row.dimensions,...Object.fromEntries(measurements.map(m=>[m,number(row.measurements[m][i])]))});}
  }
 }
 return out;
}
function results(pages){return pages.flatMap(page=>{const rows=page.data?.attributes?.results;if(!Array.isArray(rows))throw Error('Incomplete reporting response');return rows;});}
function performance(row,stats){const g=row.groupings;if(!g||!['email','sms'].includes(g.send_channel))throw Error('Invalid report grouping');return{send_channel:g.send_channel,variation:g.variation??'',variation_name:g.variation_name??null,...Object.fromEntries(stats.map(s=>[s,number(row.statistics?.[s])]))};}
export function flowRows(pages,stats=statistics,date){parseDate(date);return results(pages).map(row=>{const g=row.groupings;if(!g?.flow_id||!g.flow_message_id)throw Error('Missing flow identity');return{date,flow_id:g.flow_id,flow_message_id:g.flow_message_id,...performance(row,stats)};});}
export function campaignRows(pages,campaigns,stats=statistics){return results(pages).map(row=>{const g=row.groupings,metadata=campaigns.get(g?.campaign_id);if(!g?.campaign_id||!g.campaign_message_id||!metadata?.send_time)throw Error('Missing campaign send date');return{campaign_id:g.campaign_id,campaign_message_id:g.campaign_message_id,send_date:localDay(metadata.send_time),...performance(row,stats)};});}
const mutableTables=new Set(['fact_metric_daily','fact_flow_daily','fact_campaign_performance','fact_email_link_daily','fact_subscriber_daily']);
export async function replaceSlice(db,table,dateColumn,start,end,rows){
 if(!mutableTables.has(table)||!['date','send_date'].includes(dateColumn))throw Error('Invalid EDM replacement target');days(start,end);
 if(rows.some(row=>typeof row[dateColumn]!=='string'||row[dateColumn]<start||row[dateColumn]>=end))throw Error('EDM result outside requested dates');
 await db.query('BEGIN');try{
  await db.query(`DELETE FROM ${table} WHERE ${dateColumn}>=$1::date AND ${dateColumn}<$2::date`,[start,end]);
  if(rows.length){const columns=[...new Set(rows.flatMap(r=>Object.keys(r)))];if(columns.some(c=>!/^[a-z_]+$/.test(c)))throw Error('Invalid EDM column');for(let i=0;i<rows.length;i+=1000)await db.query(`INSERT INTO ${table} (${columns.join(',')}) SELECT ${columns.join(',')} FROM json_populate_recordset(NULL::${table},$1::json)`,[JSON.stringify(rows.slice(i,i+1000))]);}
  await db.query('COMMIT');
 }catch(error){await db.query('ROLLBACK');throw error;}
}
