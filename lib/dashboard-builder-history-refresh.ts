import type {EditorDocument,Workspace} from './ai-dashboard-editor.ts';
import type {DashboardReport,ReportSpec} from './ai-dashboard.ts';
import {refreshTextSummaries} from './ai-dashboard-text.ts';
import {repairGeneratedSummary} from './dashboard-builder-workspace.ts';
type Period=ReportSpec['range'];
type PeriodEditor=EditorDocument&{defaultPeriod?:Period};
const key=(range:Period)=>`${range.start}/${range.end}`;
const datasetKey=(widget:ReportSpec['widgets'][number])=>JSON.stringify([widget.source,widget.groupBy]);
const systemLabel='Updated Last Week';
/** Refresh data throughout presentation history without recording a user action or losing Redo. */
export async function refreshEditorReportingPeriod(editor:EditorDocument,targetRange:Period,hydrate:(spec:ReportSpec)=>Promise<DashboardReport>):Promise<PeriodEditor>{
 for(const date of [targetRange.start,targetRange.end])if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Invalid reporting period');
 if(targetRange.start>targetRange.end)throw new Error('Invalid reporting period');
 const original=editor as PeriodEditor;
 const systems=[...editor.history,...editor.future].filter(entry=>entry.label===systemLabel);
 const contexts=systems.flatMap(entry=>[entry.before,entry.after]);
 const automatic=new Set(contexts.map(workspace=>key(workspace.report.range)));
 if(original.defaultPeriod)automatic.add(key(original.defaultPeriod));
 if(!original.defaultPeriod&&key(editor.current.report.range)==='2026-10-20/2026-10-26'&&/overview/i.test(editor.current.report.title))automatic.add(key(editor.current.report.range));
 const history=editor.history.filter(entry=>entry.label!==systemLabel);
 const future=editor.future.filter(entry=>entry.label!==systemLabel);
 const workspaces=[editor.current,...[...history,...future].flatMap(entry=>[entry.before,entry.after])];
 const applicable=workspaces.filter(workspace=>automatic.has(key(workspace.report.range)));
 const needsData=systems.length>0||applicable.some(workspace=>key(workspace.report.range)!==key(targetRange));
 type Materialized=DashboardReport['widgets'][number];
 const refreshed=new Map<string,Materialized>();
 let metadata:Pick<DashboardReport,'snapshotId'|'generatedAt'>|undefined;
 if(needsData){
  const unique=new Map<string,Materialized>();
  for(const workspace of applicable)for(const widget of workspace.report.widgets)unique.set(datasetKey(widget),widget);
  const widgets=[...unique.values()].map((widget,index)=>({id:`period-data-${index}`,title:widget.title,kind:'table' as const,source:widget.source,groupBy:widget.groupBy,metrics:[widget.metrics[0]]}));
  for(let offset=0;offset<widgets.length;offset+=24){
   const batch=widgets.slice(offset,offset+24);
   const report=await hydrate({title:editor.current.report.title,summary:editor.current.report.summary,range:{...targetRange},widgets:batch});
   if(key(report.range)!==key(targetRange))throw new Error('Hydration returned a different reporting period');
   for(const requested of batch){
    const widget=report.widgets.find(candidate=>candidate.id===requested.id);
    if(!widget||datasetKey(widget)!==datasetKey(requested)||key(widget.range)!==key(targetRange)||!Array.isArray(widget.rows))throw new Error('Hydration omitted or changed a reporting dataset');
    refreshed.set(datasetKey(requested),structuredClone(widget));
   }
   metadata={snapshotId:report.snapshotId,generatedAt:report.generatedAt};
  }
 }
 const refresh=(workspace:Workspace):Workspace=>{
  if(!automatic.has(key(workspace.report.range)))return structuredClone(workspace);
  const repaired=repairGeneratedSummary(workspace,contexts);
  if(!needsData)return structuredClone(repaired);
  const widgets=workspace.report.widgets.map(widget=>{
   const fresh=refreshed.get(datasetKey(widget));
   if(!fresh)throw new Error('Missing refreshed reporting dataset');
   const rows=structuredClone(fresh.rows);
   if(widget.sortBy)rows.sort((a,b)=>Number(b[widget.sortBy!]??0)-Number(a[widget.sortBy!]??0));
   return {...widget,source:fresh.source,groupBy:fresh.groupBy,range:{...targetRange},currency:fresh.currency,timezone:fresh.timezone,rows,warnings:structuredClone(fresh.warnings),coverage:fresh.coverage,comparisons:structuredClone(fresh.comparisons)};
  });
  const report={...workspace.report,...metadata,range:{...targetRange},widgets,warnings:[...new Set(widgets.flatMap(widget=>widget.warnings))]};
  return structuredClone({...repaired,report,texts:repaired.texts?refreshTextSummaries(report,repaired.texts,repaired.hidden):repaired.texts});
 };
 const next:PeriodEditor={...original,defaultPeriod:{...targetRange},current:refresh(editor.current),history:history.map(entry=>({...entry,before:refresh(entry.before),after:refresh(entry.after)})),future:future.map(entry=>({...entry,before:refresh(entry.before),after:refresh(entry.after)}))};
 if(JSON.stringify(next)===JSON.stringify(original))return original;
 return {...next,revision:editor.revision+1};
}
