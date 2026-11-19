import type {PresentationDataset} from './testing-insight-presentation.ts';

type Range={start:string;end:string};
export type AiDatasetPolicy={periods:Range[];entities:Array<{channel:string;id:string;start:string}>;scopes:string[]};
export type AiDatasetRow={category:string;period:Range;entities:string[];source:{channel:string;reference:string;request:string;retrieved_at:string};values:Array<{key:string;value:number|null}>};
export type AiDataset={id:string;scope:string;columns:Array<{key:string;unit:string}>;rows:AiDatasetRow[]};
export type AiDatasetProvenance=Record<string,Array<Omit<AiDatasetRow,'category'|'values'> & {category:string}>>;
const isDate=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(`${s}T00:00:00Z`))&&new Date(`${s}T00:00:00Z`).toISOString().slice(0,10)===s;
const bounded=(s:unknown,max=300):s is string=>typeof s==='string'&&s.trim().length>0&&s.length<=max&&!/[\u0000-\u001f\u007f]/.test(s);
function sourceReference(value:string){
 if(!bounded(value,1000))return false;
 try{const uri=new URL(value);return !['javascript:','data:','file:'].includes(uri.protocol)&&!uri.username&&!uri.password&&![...uri.searchParams.keys()].some(key=>/^(?:api_?key|key|access_token|token|refresh_token|secret|password|authorization)$/i.test(key));}catch{return false;}
}

/** Validate provenance and testing scope; no claim is made that source values were independently re-fetched. */
export function registerAiDatasets(input:AiDataset[]|undefined,policy:AiDatasetPolicy,existing:Record<string,PresentationDataset>){
 if(input===undefined)return {datasets:{...existing},provenance:{} as AiDatasetProvenance};
 if(!Array.isArray(input)||input.length>30)throw Error('Invalid supplemental datasets');
 const datasets={...existing},provenance:AiDatasetProvenance={};
 for(const item of input){
  if(!item||!bounded(item.id,150)||!/^ai\.[a-zA-Z0-9._-]+$/.test(item.id)||Object.hasOwn(datasets,item.id)||!policy.scopes.includes(item.scope)||!Array.isArray(item.columns)||!item.columns.length||item.columns.length>20||!Array.isArray(item.rows)||!item.rows.length||item.rows.length>500)throw Error('Invalid supplemental dataset');
  const columns:Record<string,string>={category:'category'};
  for(const col of item.columns){if(!col||!bounded(col.key,80)||!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(col.key)||col.key==='category'||Object.hasOwn(columns,col.key)||!bounded(col.unit,60))throw Error('Invalid supplemental dataset column');columns[col.key]=col.unit;}
  const rows:Array<Record<string,string|number|null>>=[],sources:AiDatasetProvenance[string]=[];
  for(const row of item.rows){
   if(!row||!bounded(row.category,200)||!row.period||!isDate(row.period.start)||!isDate(row.period.end)||row.period.start>row.period.end||!policy.periods.some(p=>row.period.start>=p.start&&row.period.end<=p.end)||!Array.isArray(row.entities)||!row.entities.length||row.entities.length>100||!row.source||!bounded(row.source.channel,80)||!sourceReference(row.source.reference)||!bounded(row.source.request,1000)||!bounded(row.source.retrieved_at,80)||Number.isNaN(Date.parse(row.source.retrieved_at))||!Array.isArray(row.values))throw Error('Invalid supplemental dataset provenance');
   for(const id of row.entities){const entity=policy.entities.find(x=>x.channel===row.source.channel&&x.id===id);if(!entity||!isDate(entity.start)||row.period.start<entity.start||item.scope!=='channel'&&id!==item.scope)throw Error('Supplemental data is outside the verified testing scope');}
   const result:Record<string,string|number|null>={category:row.category};for(const col of item.columns)result[col.key]=null;
   const used=new Set<string>();for(const value of row.values){if(!value||!Object.hasOwn(columns,value.key)||value.key==='category'||used.has(value.key)||value.value!==null&&(typeof value.value!=='number'||!Number.isFinite(value.value)))throw Error('Invalid supplemental data value');used.add(value.key);result[value.key]=value.value;}
   if(!used.size)throw Error('Supplemental data row has no values');rows.push(result);sources.push({category:row.category,period:row.period,entities:row.entities,source:row.source});
  }
  datasets[item.id]={id:item.id,scopes:[item.scope],xKey:'category',columns,rows,provenance:{verification:'scope-checked-source-unverified',rows:sources}};provenance[item.id]=sources;
 }
 return {datasets,provenance};
}

import {testingCampaignStart} from './testing-campaign-starts.ts';
import {contentTestingStartDates} from './testing-report-scope.ts';
import type {TestingInventoryChannel} from './testing-inventory-model.ts';
/** Build scope from application evidence, never from the model's returned metadata. */
export function buildAiDatasetPolicy(frozen:Record<string,any>,channel:string,evidenceJobs:Record<string,any>={}):AiDatasetPolicy {
 const ctx=frozen.visual_context??frozen;
 const periods=[ctx.period??frozen.period,ctx.comparison??frozen.comparison].filter((p:any)=>p&&isDate(p.start)&&isDate(p.end)&&p.start<=p.end).map((p:any)=>({start:p.start,end:p.end}));
 const sources=channel==='overview'?Object.entries(evidenceJobs).map(([name,job])=>[name,(job as any)?.frozen_input] as const):[[channel,frozen] as const];
 const entities:AiDatasetPolicy['entities']=[];
 for(const [name,input] of sources){
  if(!input||name==='overview')continue;
  for(const test of input.tests??[]){
   const id=test?.test_id;if(typeof id!=='string')continue;
   const start=testingCampaignStart(name as TestingInventoryChannel,id);
   if(start)entities.push({channel:name,id,start});
  }
  if(name==='social-media')for(const post of [...(input.social_posts?.current??[]),...(input.social_posts?.previous??[]),...(input.social_lifetime_snapshot?.posts??[])]){
   const id=post.code??post.id;const published=post.publishedAt?.slice(0,10);if(typeof id==='string'&&isDate(published)){const start=published>contentTestingStartDates['social-media']?published:contentTestingStartDates['social-media'];if(!entities.some(item=>item.channel===name&&item.id===id))entities.push({channel:name,id,start});}
  }
 }
 return {periods,entities,scopes:['channel',...(channel==='overview'?[]:(frozen.campaigns??[]).filter((id:unknown):id is string=>typeof id==='string'))]};
}
