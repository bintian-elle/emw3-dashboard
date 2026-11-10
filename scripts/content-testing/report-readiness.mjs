export const REPORT_CHANNELS=['google-search','google-pmax','google-demand-gen','meta','reddit','social-media','edm'];
export function refreshRecords(data,google){
 const item=(source,key)=>source?.items?.[key];
 return {'google-search':item(google,'google:all'),'google-pmax':item(google,'google:all'),'google-demand-gen':item(google,'google:all'),meta:item(data,'meta:lastWeek'),reddit:item(data,'reddit:lastWeek'),edm:item(data,'edm:lastWeek'),'social-media':item(data,'social:all')};
}
/** Require actual successful source updates for every channel on the report's Eastern calendar day. */
export function updatedOnReportingDay(record,day,now=new Date().toISOString()){
 const time=Date.parse(record?.updatedAt);
 if(record?.success!==true||!Number.isFinite(time)||time>Date.parse(now))return false;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(time).map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}`===day;
}
export function missingUpdatedChannels(records,day,now=new Date().toISOString()){
 return REPORT_CHANNELS.filter(channel=>!updatedOnReportingDay(records[channel],day,now));
}
