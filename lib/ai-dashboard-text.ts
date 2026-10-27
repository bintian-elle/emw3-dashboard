import type {DashboardReport} from './ai-dashboard.ts';
import type {Workspace} from './ai-dashboard-editor.ts';
export type TextBlock={id:string;title:string;kind:'text';role:'summary'|'note';autoSummary:boolean;content:string};
export function validateTextBlocks(value:unknown):TextBlock[]{
 if(value===undefined)return[];if(!Array.isArray(value)||value.length>24)throw Error('Choose up to 24 text boxes.');
 const ids=new Set<string>();return value.map(raw=>{if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid text box.');const v=raw as Record<string,unknown>;
  if(Object.keys(v).some(k=>!['id','title','kind','role','autoSummary','content'].includes(k)))throw Error('Unsupported field in text box.');
  if(typeof v.id!=='string'||!/^[\w-]{1,60}$/.test(v.id)||ids.has(v.id))throw Error('Text box IDs must be unique.');ids.add(v.id);
  if(v.kind!=='text'||!['summary','note'].includes(String(v.role))||typeof v.autoSummary!=='boolean'||(v.autoSummary&&v.role!=='summary')||typeof v.content!=='string'||v.content.length>10000||typeof v.title!=='string'||!v.title.trim()||v.title.length>150)throw Error('Invalid text box content.');
  return{id:v.id,title:v.title,kind:'text',role:v.role as TextBlock['role'],autoSummary:v.autoSummary,content:v.content};
 });
}
function valueText(value:number,metric:string,currency:string){if(/_(pop|yoy)$/.test(metric))return(value>=0?'+':'')+value.toFixed(1)+'%';if(['spend','revenue','cpc','cpa','campaignRevenue','flowRevenue'].includes(metric))return new Intl.NumberFormat('en-US',{style:'currency',currency,maximumFractionDigits:2}).format(value);if(metric==='roas')return value.toFixed(2)+'×';if(['ctr','engagementRate'].includes(metric))return(value*100).toFixed(2)+'%';return new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(value);}
export function buildPageSummary(report:DashboardReport,hidden:string[]=[]){
 const visible=report.widgets.filter(w=>!hidden.includes(w.id));const cards=visible.filter(w=>w.kind==='metric');const facts:string[]=[];
 for(const widget of cards.slice(0,4)){const metric=widget.metrics[0],value=widget.rows[0]?.[metric];if(typeof value==='number'&&Number.isFinite(value))facts.push(`${widget.title}: ${valueText(value,metric,widget.currency)}`);}
 if(!facts.length){for(const widget of visible){const metric=widget.metrics.find(m=>m==='spend'||m==='revenue');if(!metric||!widget.rows.length||widget.rows.some(r=>typeof r[metric]!=='number'||!Number.isFinite(r[metric])))continue;if(widget.source==='paid_media'&&metric==='revenue'){const best=[...widget.rows].sort((a,b)=>Number(b.revenue)-Number(a.revenue))[0];facts.push(`Highest reported attributed revenue: ${best.label} ${valueText(Number(best.revenue),'revenue',widget.currency)}`);if(facts.length===2)break;continue;}facts.push(`${widget.title}: ${valueText(widget.rows.reduce((sum,row)=>sum+Number(row[metric]),0),metric,widget.currency)}`);if(facts.length===2)break;}}
 if(!facts.length)return 'No data components to summarize yet.';
 const start=new Date(report.range.start+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'}),end=new Date(report.range.end+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
 let content=`${start} – ${end}. ${facts.join(' · ')}.`;
 const channels=visible.find(w=>w.source==='paid_media'&&w.groupBy==='channel'&&w.rows.some(r=>typeof r.roas==='number'));
 if(channels){const rows=channels.rows.filter(r=>typeof r.roas==='number').sort((a,b)=>Number(b.roas)-Number(a.roas)),best=rows[0];if(best)content+=` Highest reported channel ROAS: ${best.label} at ${Number(best.roas).toFixed(2)}×.`;}
 return content;
}
export function refreshTextSummaries(report:DashboardReport,texts:TextBlock[]=[],hidden:string[]=[]){return texts.map(text=>text.role==='summary'&&text.autoSummary?{...text,content:buildPageSummary(report,hidden)}:text);}
export function withDefaultText(workspace:Workspace):Workspace{
 const existing=workspace.texts||[];if(!workspace.report.widgets.length)return{...workspace,texts:existing};
 const used=new Set([...workspace.report.widgets,...existing].map(w=>w.id));let summary=existing.find(t=>t.role==='summary');if(!summary){let id='dashboard-summary',suffix=1;while(used.has(id))id=`dashboard-summary-${suffix++}`;summary={id,title:'Summary',kind:'text',role:'summary',autoSummary:true,content:buildPageSummary(workspace.report,workspace.hidden)};}
 const texts=existing.some(t=>t.id===summary!.id)?existing:[summary,...existing];return{...workspace,texts:refreshTextSummaries(workspace.report,texts,workspace.hidden),order:[summary.id,...workspace.order.filter(id=>id!==summary!.id)]};
}
export const TEXT_SCHEMA={type:'object',additionalProperties:false,properties:{id:{type:'string',pattern:'^[a-zA-Z0-9_-]{1,60}$'},title:{type:'string',minLength:1,maxLength:150},kind:{type:'string',enum:['text']},role:{type:'string',enum:['summary','note']},autoSummary:{type:'boolean'},content:{type:'string',maxLength:10000}},required:['id','title','kind','role','autoSummary','content']};
