// Persist only known diagnostic categories, never upstream text, URLs or payloads.
export function trackingFailure(error:unknown){
 const message=error instanceof Error?error.message:typeof error==='string'?error:'';
 const code=message.match(/timed?\s*out|timeout/i)?'query_timeout'
  :message.match(/partial GA4 report|preview without a full report/i)?'incomplete_report'
  :message.match(/different GA4 property/i)?'property_mismatch'
  :message.match(/invalid response/i)?'invalid_response'
  :message.match(/connection|shared GA4 query failed/i)?'connection_or_tool_failure'
  :message.match(/unavailable report/i)?'upstream_unavailable'
  :message.match(/lost lock/i)?'refresh_lock_lost'
  :message.match(/Incomplete report/i)?'incomplete_report':'refresh_failed';
 const reasons={query_timeout:'GA4 query exceeded its time limit.',incomplete_report:'GA4 returned an incomplete report.',property_mismatch:'GA4 returned an unexpected property.',invalid_response:'GA4 tool returned an invalid response.',connection_or_tool_failure:'GA4 connection or read-only tool failed.',upstream_unavailable:'GA4 report was unavailable.',refresh_lock_lost:'Refresh lock was lost.',refresh_failed:'Refresh failed; upstream text was omitted for privacy.'};
 return {code,reason:reasons[code]};
}
export function reportFailure(value:unknown,section='report'):{code:string;reason:string;section:string}|undefined{
 if(!value||typeof value!=='object')return;
 const report=value as Record<string,unknown>;
 if(report.error)return {...trackingFailure(report.error),section};
 if(Array.isArray(report.warnings)&&report.warnings.some(w=>typeof w==='string'&&w.startsWith('Partial GA4 report')))return {...trackingFailure('Partial GA4 report'),section};
 for(const key of ['overview','devices','events','actions','lists','purchases','features','items','coupons','collection','visitors','clicks','collectionDaily','comparison','daily','paths']){
  const found=reportFailure(report[key],section==='report'?key:`${section}.${key}`);
  if(found)return found;
 }
}
