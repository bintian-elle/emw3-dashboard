import type {DateRange} from "./klaviyo-dashboard";

export const edmPresets=["Last Week (Tue–Mon)","Week-to-date","Month-to-date","Year-to-date","Last 7 days","Last 30 days","Last 90 days","Custom"];
export const edmComparisons=["Previous period","Previous year",...edmPresets];
const date=(value:string)=>new Date(`${value}T00:00:00Z`);
const iso=(value:Date)=>value.toISOString().slice(0,10);
function shift(value:string,days:number){const d=date(value);d.setUTCDate(d.getUTCDate()+days);return iso(d);}
// Preserve the dashboard's existing period calculations when matching labels.
export function edmRangeFor(label:string,today:string):DateRange{
 const weekday=(date(today).getUTCDay()+6)%7;
 if(label==="Last Week (Tue–Mon)"){const end=shift(today,-weekday);return {start:shift(end,-6),end};}
 if(label==="Week-to-date")return {start:shift(today,-weekday),end:today};
 if(label==="Month-to-date")return {start:`${today.slice(0,7)}-01`,end:today};
 if(label==="Last 7 days")return {start:shift(today,-7),end:today};
 if(label==="Last 30 days")return {start:shift(today,-30),end:today};
 if(label==="Last 90 days")return {start:shift(today,-90),end:today};
 return {start:`${today.slice(0,4)}-01-01`,end:today};
}
export const isRelativeComparison=(label:string)=>label==="Previous period"||label==="Previous year";
export function edmCompareRange(range:DateRange,kind:string,today?:string):DateRange{
 if(!isRelativeComparison(kind)&&today)return edmRangeFor(kind,today);
 if(kind==="Previous year")return {start:`${+range.start.slice(0,4)-1}${range.start.slice(4)}`,end:`${+range.end.slice(0,4)-1}${range.end.slice(4)}`};
 const days=Math.round((date(range.end).getTime()-date(range.start).getTime())/86400000)+1;
 return {start:shift(range.start,-days),end:shift(range.end,-days)};
}
const equal=(a:DateRange,b:DateRange)=>a.start===b.start&&a.end===b.end;
export function matchEdmPeriod(range:DateRange,today:string,preferred?:string){
 const candidates=edmPresets.filter(label=>label!=="Custom");
 if(preferred&&candidates.includes(preferred)&&equal(range,edmRangeFor(preferred,today)))return preferred;
 return candidates.find(label=>equal(range,edmRangeFor(label,today)))??"Custom";
}
export function matchEdmComparison(comparisonRange:DateRange,range:DateRange,today:string,preferred?:string){
 const candidates=edmComparisons.filter(label=>label!=="Custom");
 if(preferred&&candidates.includes(preferred)&&equal(comparisonRange,edmCompareRange(range,preferred,today)))return preferred;
 return candidates.find(label=>equal(comparisonRange,edmCompareRange(range,label,today)))??"Custom";
}
export function swapEdmPeriods(range:DateRange,comparisonRange:DateRange,today:string,preset?:string,comparison?:string){
 return {range:comparisonRange,comparisonRange:range,preset:matchEdmPeriod(comparisonRange,today,comparison),comparison:matchEdmComparison(range,comparisonRange,today,preset)};
}
