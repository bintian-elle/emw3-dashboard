/** Only use dates explicitly covered by successful warehouse extraction queries. */
export type WarehouseRun={query_text:string|null;completed_at:string|Date|null};
export type DateWindow={start:string;end:string};
export function warehouseCoverage(runs:WarehouseRun[],start:string,end:string,now=Date.now()):DateWindow[]{
 const ranges=runs.flatMap(run=>{
  const match=run.query_text?.match(/segments\.date\s+BETWEEN\s+'(\d{4}-\d{2}-\d{2})'\s+AND\s+'(\d{4}-\d{2}-\d{2})'/i);
  if(!match||!run.completed_at)return [];
  const completed=new Date(run.completed_at).getTime();
  if(!Number.isFinite(completed)||completed>now+60000)return [];
  // Current and recent attribution can change: old extraction records are not sufficient.
  const stableEnd=new Date(now-8*86400000).toISOString().slice(0,10);
  const last=now-completed<=36*3600000?match[2]:match[2]<stableEnd?match[2]:stableEnd;
  const yesterday=new Date(now-86400000).toISOString().slice(0,10);
  const limit=end<yesterday?end:yesterday;
  const a=match[1]>start?match[1]:start,b=last<limit?last:limit;
  return a<=b?[{start:a,end:b}]:[];
 }).sort((a,b)=>a.start.localeCompare(b.start));
 const merged:DateWindow[]=[];
 for(const range of ranges){const prev=merged.at(-1);if(prev&&range.start<=nextDay(prev.end)){if(range.end>prev.end)prev.end=range.end;}else merged.push({...range});}
 return merged;
}
export function nextDay(date:string){return new Date(Date.parse(date+'T00:00:00Z')+86400000).toISOString().slice(0,10);}
export function uncoveredWindows(covered:DateWindow[],start:string,end:string):DateWindow[]{
 const missing:DateWindow[]=[];let cursor=start;
 for(const range of covered){if(range.start>cursor)missing.push({start:cursor,end:new Date(Date.parse(range.start+'T00:00:00Z')-86400000).toISOString().slice(0,10)});if(range.end>=cursor)cursor=nextDay(range.end);}
 if(cursor<=end)missing.push({start:cursor,end});return missing;
}
