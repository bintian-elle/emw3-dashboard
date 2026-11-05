import {resolveTestingPeriod} from './testing-period.ts';

export type ComparisonRange={start:string;end:string};
export type ComparisonMetrics=Record<string,number|null>;
export type ComparisonPacket={rows:Record<string,ComparisonMetrics>;unavailable:string[];period:ComparisonRange};
export const comparisonPresets=['lastWeek','wtd','mtd','ytd','last7','last30','last90'] as const;
const shift=(value:string,days:number)=>{const date=new Date(`${value}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
export function comparisonRange(range:ComparisonRange,kind:string,latest:string,custom?:ComparisonRange):ComparisonRange{
 if(kind==='custom'&&custom)return custom;
 if(kind==='previousYear'){
  const year=(value:string)=>{const date=new Date(`${value}T12:00:00Z`),month=date.getUTCMonth();date.setUTCFullYear(date.getUTCFullYear()-1);if(date.getUTCMonth()!==month)date.setUTCDate(0);return date.toISOString().slice(0,10);};
  return {start:year(range.start),end:year(range.end)};
 }
 if(comparisonPresets.includes(kind as typeof comparisonPresets[number]))return resolveTestingPeriod(latest,{preset:kind as typeof comparisonPresets[number]});
 const days=Math.round((Date.parse(range.end)-Date.parse(range.start))/86400000)+1;
 return {start:shift(range.start,-days),end:shift(range.start,-1)};
}
export function matchTestingRange(range:ComparisonRange,latest:string){return comparisonPresets.find(preset=>{const candidate=resolveTestingPeriod(latest,{preset});return candidate.start===range.start&&candidate.end===range.end;})??'custom';}
/** Relative comparisons take precedence over calendar presets in trial controls. */
export function matchComparisonRange(current:ComparisonRange,previous:ComparisonRange,latest:string){
 for(const kind of ['previousPeriod','previousYear']){const range=comparisonRange(current,kind,latest);if(range.start===previous.start&&range.end===previous.end)return kind;}
 return matchTestingRange(previous,latest);
}
export function periodOnPeriod(current:number|null|undefined,previous:number|null|undefined){
 return current==null||previous==null||!Number.isFinite(current)||!Number.isFinite(previous)||previous===0?null:(current-previous)/Math.abs(previous);
}
/** Retain genuine numeric values, never coerce unavailable values to zero. */
export function comparisonMetricValues(value:object):ComparisonMetrics{
 const metrics=Object.fromEntries(Object.entries(value).filter(([,item])=>item===null||typeof item==='number'&&Number.isFinite(item))) as ComparisonMetrics;
 if('orders' in metrics&&'revenue' in metrics)metrics.aov=metrics.orders!=null&&metrics.orders>0&&metrics.revenue!=null?metrics.revenue/metrics.orders:null;
 return metrics;
}
