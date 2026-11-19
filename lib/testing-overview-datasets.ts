import type {PresentationDataset} from './testing-insight-presentation.ts';

type Range={start:string;end:string};
type ObjectValue=Record<string,unknown>;
type MetricRow=Record<string,number|null>;
const record=(v:unknown):ObjectValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as ObjectValue:{};
const list=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const sameRange=(a:unknown,b:Range)=>{const r=record(a);return r.start===b.start&&r.end===b.end;};
const names:Record<string,string>={'google-search':'Google Search','google-pmax':'Google PMax','google-demand-gen':'Google Demand Gen',meta:'Meta',reddit:'Reddit'};
const fields=['spend','revenue','orders','clicks','impressions'] as const;

/** Extract only the testing entities used by each channel, never asset associations or whole Reddit campaigns. */
function metricRows(channel:string,campaign:unknown):unknown[]{
 const c=record(campaign);
 if(channel==='meta')return c.totals?[c.totals]:[];
 const groups=list(c.groups);
 if(channel==='google-search')return groups;
 if(channel==='reddit')return groups.flatMap(g=>list(record(g).activeAds));
 if(channel==='google-pmax'||channel==='google-demand-gen')return groups.flatMap(g=>list(record(g).rows).map(row=>record(row).metrics));
 return [];
}

/** Register only exact, verified period data; absent or truncated periods remain unavailable. */
export function buildOverviewDatasets(jobs:Record<string,unknown>,periods:{current:Range;previous:Range|null}):{datasets:Record<string,PresentationDataset>;gaps:string[]}{
 const datasets:Record<string,PresentationDataset>={},gaps:string[]=[];
 for(const [channel,label] of Object.entries(names)){
  const frozen=record(record(jobs[channel]).frozen_input),tests=list(frozen.tests);
  if(!tests.length)continue;
  const rows:Array<Record<string,string|number|null>>=[];
  for(const [which,range] of [['previous',periods.previous],['current',periods.current]] as const){
   if(!range)continue;
   const sourceRows:unknown[]=[];let valid=true,reason='';
   for(const test of tests){
    const t=record(test),scope=record(t.testing_scope),snapshot=list(t.dashboard).map(record).find(item=>sameRange(item.period,range)&&!item.unavailable);
    if(!sameRange(scope[which],range)||!snapshot){const actual=record(scope[which]);reason=typeof actual.start==='string'&&typeof actual.end==='string'?` (available ${actual.start}–${actual.end})`:'';valid=false;break;}
    const campaigns=list(record(snapshot.snapshot).campaigns);
    if(campaigns.length!==1){valid=false;break;}
    const metrics=metricRows(channel,campaigns[0]);
    if(!metrics.length){valid=false;break;}
    sourceRows.push(...metrics);
   }
   if(!valid||!sourceRows.length){gaps.push(`${channel}: ${which} period is unavailable or truncated${reason}`);continue;}
   const sum:MetricRow={};
   for(const field of fields){const values=sourceRows.map(row=>record(row)[field]);sum[field]=values.every(value=>typeof value==='number'&&Number.isFinite(value))?values.reduce<number>((a,value)=>a+(value as number),0):null;}
   sum.roas=sum.spend!=null&&sum.spend>0&&sum.revenue!=null?sum.revenue/sum.spend:null;
   sum.cpa=sum.orders!=null&&sum.orders>0&&sum.spend!=null?sum.spend/sum.orders:null;
   const category=`${range.start}–${range.end}`;
   rows.push({category,...sum});
  }
  if(rows.length){
   const id=`overview.${channel}.periods`,currency=channel==='reddit'||frozen.currency==='USD'||record(frozen.visual_context).currency==='USD'?'USD':'amount';
   datasets[id]={id,scopes:['channel'],xKey:'category',labels:{spend:`${label} Spend`,revenue:`${label} Revenue`},columns:{category:'category',spend:currency,revenue:currency,orders:'orders',clicks:'clicks',impressions:'impressions',roas:'ratio',cpa:currency},rows};
  }
 }
 // Cross-channel ratios are descriptive, not a shared attribution model or a sum of reach.
 for(const [which,range] of [['current',periods.current],['previous',periods.previous]] as const){
  if(!range)continue;
  const category=`${range.start}–${range.end}`;
  const rows=Object.entries(names).flatMap(([channel,label])=>{
   const value=datasets[`overview.${channel}.periods`]?.rows.find(row=>row.category===category);
   return value?[{category:label,roas:value.roas??null,orders:value.orders??null}]:[];
  });
  if(rows.length){const id=`overview.paid.${which}`;datasets[id]={id,scopes:['channel'],xKey:'category',columns:{category:'category',roas:'ratio',orders:'orders'},rows};}
 }
 return {datasets,gaps};
}
