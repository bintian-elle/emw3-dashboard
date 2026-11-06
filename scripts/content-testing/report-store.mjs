/** Insert an immutable, complete run in one transaction. Existing runs are never changed. */
export async function storeReportBundle(client,bundle) {
 const {run,reports,media}=bundle;
 if(!run?.id||!['daily','weekly','monthly','custom'].includes(run.kind)||!reports?.length||!Array.isArray(media)) throw Error('Invalid report bundle');
 const identities=new Set();
 for(const item of reports){
  const key=JSON.stringify([item.channel,item.scope]);
  if(!item.channel||!item.scope||identities.has(key)||!item.report?.en||!item.report?.zh)throw Error('Incomplete or duplicated bilingual report');
  identities.add(key);
 }
 await client.query('BEGIN');
 try{
  await client.query(`INSERT INTO content_testing_reports.runs (id,report_kind,period_start,period_end,comparison_start,comparison_end,status,source_checked_at,source_freshness,prompt_versions,completed_at,environment) VALUES ($1,$2,$3,$4,$5,$6,'completed',$7,$8,$9,now(),$10)`,[run.id,run.kind,run.start,run.end,run.compareStart,run.compareEnd,run.sourceCheckedAt??null,JSON.stringify(run.sourceFreshness??{}),JSON.stringify(run.promptVersions??{}),run.environment??'production']);
  for(const item of reports)await client.query('INSERT INTO content_testing_reports.reports (run_id,channel,scope,report) VALUES ($1,$2,$3,$4)',[run.id,item.channel,item.scope,JSON.stringify(item.report)]);
  for(const item of media)await client.query('INSERT INTO content_testing_reports.media (run_id,media_key,mime_type,sha256,body,metadata) VALUES ($1,$2,$3,$4,$5,$6)',[run.id,item.key,item.mimeType,item.sha256,item.body,JSON.stringify(item.metadata??{})]);
  await client.query('COMMIT');
 }catch(error){await client.query('ROLLBACK');throw error;}
}
