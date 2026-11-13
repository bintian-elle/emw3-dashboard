// Only allowlisted codes and bounded numeric timings leave the GA4 tool boundary.
export const trackingFailureReasons={
 query_timeout:'GA4 query exceeded its execution time limit.',
 queue_timeout:'GA4 shared query queue wait limit was reached.',
 rate_limited:'Google API rate or quota limit was reached.',
 authentication_failed:'Google authentication failed.',
 permission_denied:'Google denied the required read permission.',
 network_error:'Google HTTPS request failed.',
 incomplete_report:'GA4 returned an incomplete report.',
 property_mismatch:'GA4 returned an unexpected property.',
 invalid_response:'GA4 tool returned an invalid response.',
 connection_or_tool_failure:'GA4 connection or read-only tool failed.',
 upstream_unavailable:'GA4 report was unavailable.',
 refresh_lock_lost:'Refresh lock was lost.',
 refresh_failed:'Refresh failed; upstream text was omitted for privacy.',
};
type Code=keyof typeof trackingFailureReasons;
export type TrackingFailure={code:Code;reason:string;queueWaitSeconds?:number;elapsedSeconds?:number;httpStatus?:number};
function seconds(value:unknown){return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=3600?Math.round(value*1000)/1000:undefined;}
export function trackingError(code:Code,details:{queueWaitSeconds?:unknown;elapsedSeconds?:unknown;httpStatus?:unknown}={}){
 const queue=seconds(details.queueWaitSeconds),elapsed=seconds(details.elapsedSeconds);
 const http=typeof details.httpStatus==='number'&&Number.isInteger(details.httpStatus)&&details.httpStatus>=100&&details.httpStatus<=599?details.httpStatus:undefined;
 return Error(`GA4 ${code}; ${trackingFailureReasons[code]}${queue===undefined?'':`; queue_wait_seconds=${queue}`}${elapsed===undefined?'':`; elapsed_seconds=${elapsed}`}${http===undefined?'':`; http_status=${http}`}`);
}
export function trackingFailure(error:unknown):TrackingFailure{
 const message=error instanceof Error?error.message:typeof error==='string'?error:'';
 const explicit=message.match(/^GA4 ([a-z_]+);/)?.[1];
 const code:Code=explicit&&Object.hasOwn(trackingFailureReasons,explicit)?explicit as Code
  :/timed?\s*out|timeout/i.test(message)?'query_timeout'
  :/partial GA4 report|preview without a full report|Incomplete report/i.test(message)?'incomplete_report'
  :/different GA4 property/i.test(message)?'property_mismatch'
  :/invalid response/i.test(message)?'invalid_response'
  :/connection|shared GA4 query failed/i.test(message)?'connection_or_tool_failure'
  :/unavailable report/i.test(message)?'upstream_unavailable'
  :/lost lock/i.test(message)?'refresh_lock_lost':'refresh_failed';
 const number=(key:string)=>seconds(Number(message.match(new RegExp(`; ${key}=([0-9.]+)(?:;|$)`))?.[1]??NaN));
 const queue=explicit?number('queue_wait_seconds'):undefined,elapsed=explicit?number('elapsed_seconds'):undefined;
 const http=explicit?number('http_status'):undefined;
 return {code,reason:trackingFailureReasons[code],...(queue===undefined?{}:{queueWaitSeconds:queue}),...(elapsed===undefined?{}:{elapsedSeconds:elapsed}),...(http!==undefined&&Number.isInteger(http)&&http>=100&&http<=599?{httpStatus:http}:{})};
}
export function reportFailure(value:unknown,section='report'):(TrackingFailure&{section:string})|undefined{
 if(!value||typeof value!=='object')return;
 const report=value as Record<string,unknown>;
 if(report.error)return {...trackingFailure(report.error),section};
 if(Array.isArray(report.warnings)&&report.warnings.some(w=>typeof w==='string'&&w.startsWith('Partial GA4 report')))return {...trackingFailure('Partial GA4 report'),section};
 for(const key of ['overview','devices','events','actions','lists','purchases','features','items','coupons','collection','visitors','clicks','collectionDaily','comparison','daily','paths']){
  const found=reportFailure(report[key],section==='report'?key:`${section}.${key}`);
  if(found)return found;
 }
}
