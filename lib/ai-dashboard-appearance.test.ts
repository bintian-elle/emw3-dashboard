import test from 'node:test';
import assert from 'node:assert/strict';
import {applyDashboardPlan,validateEditorContext} from './ai-dashboard-actions.ts';
import {newEditor,editorContext,applyAiEdit,undoEditor,redoEditor,parseEditor,type Workspace} from './ai-dashboard-editor.ts';
import {validateAppearance} from './ai-dashboard-appearance.ts';
const range={start:'2026-10-13',end:'2026-10-19'};
const widgets=[{id:'daily',title:'Daily paid spend',kind:'line' as const,source:'paid_media' as const,groupBy:'day' as const,metrics:['spend']},{id:'store',title:'Store sales',kind:'metric' as const,source:'store' as const,groupBy:'overview' as const,metrics:['revenue']},{id:'table',title:'Channels',kind:'table' as const,source:'paid_media' as const,groupBy:'channel' as const,metrics:['spend']}];
const workspace:Workspace={report:{title:'Overview',summary:'Data summary',range,widgets:widgets.map(w=>({...w,range,rows:[{label:'Source',spend:42,revenue:100}],currency:'USD',timezone:'UTC',warnings:[]})),warnings:[],snapshotId:'test',generatedAt:'now'},order:widgets.map(w=>w.id),hidden:[],colors:{}};
const plan=(operations:unknown[])=>({answer:'Updated appearance',title:null,range:null,operations});
test('AI style changes hide chart data and metric caption without deleting components or source values',()=>{
 const original=newEditor(workspace),context=editorContext(original);
 const next=applyDashboardPlan(context,plan([{type:'style',id:'daily',style:{chartData:false,legend:false,grid:'both',dataLabels:'show'}},{type:'style',id:'store',style:{caption:{mode:'hidden',text:null}}},{type:'style',id:'table',style:{tableLines:'both',stripedRows:false,density:'compact',tableHeader:false}}]));
 assert.equal(next.changed,true);assert.deepEqual(next.report,context.report);assert.deepEqual(next.order,context.order);assert.deepEqual(next.hidden,[]);
 assert.equal(next.appearance.daily.chartData,false);assert.equal(next.appearance.store.caption,null);assert.equal(next.appearance.table.tableLines,'both');assert.equal(next.appearance.table.stripedRows,false);
 const applied=applyAiEdit(original,workspace.report,{...next,baseRevision:0},'AI styles').editor;
 assert.deepEqual(applied.current.report,workspace.report);assert.equal(applied.history.length,1);
 assert.deepEqual(undoEditor(applied).current,workspace);
 const restored=redoEditor(undoEditor(applied));assert.deepEqual(restored.current.appearance,next.appearance);
 assert.deepEqual(parseEditor(JSON.parse(JSON.stringify(restored)))?.current.appearance,next.appearance);
 assert.deepEqual(editorContext(restored).appearance,next.appearance);
});
test('captions support custom text and default restoration; chart/table defaults do not create phantom edits',()=>{
 const context=editorContext(newEditor(workspace));const defaults=applyDashboardPlan(context,plan([{type:'style',id:'daily',style:{chartData:true,legend:true,grid:'horizontal',dataLabels:'auto'}},{type:'style',id:'table',style:{tableLines:'horizontal',stripedRows:true,density:'comfortable',tableHeader:true}},{type:'style',id:'store',style:{caption:{mode:'default',text:null}}}]));assert.equal(defaults.changed,false);
 const custom=applyDashboardPlan(context,plan([{type:'style',id:'store',style:{caption:{mode:'custom',text:'Website sales'}}}]));assert.equal(custom.appearance.store.caption,'Website sales');
 const reset=applyDashboardPlan({...context,appearance:custom.appearance},plan([{type:'style',id:'store',style:{caption:{mode:'default',text:null}}}]));assert.deepEqual(reset.appearance,{});
 const hidden=applyDashboardPlan(context,plan([{type:'style',id:'daily',style:{chartData:false}},{type:'remove',id:'daily'}]));assert.deepEqual(hidden.appearance,{});
});
test('invalid presentation requests are atomic and cannot alter report data or unsupported components',()=>{
 const context=editorContext(newEditor(workspace)),before=JSON.stringify(context);
 for(const operation of [{type:'style',id:'missing',style:{chartData:false}},{type:'style',id:'store',style:{chartData:false}},{type:'style',id:'daily',style:{caption:{mode:'hidden',text:null}}},{type:'style',id:'table',style:{tableLines:'dotted'}},{type:'style',id:'daily',style:{rows:[]}},{type:'style',id:'store',style:{caption:{mode:'custom',text:'x'.repeat(301)}}}])assert.throws(()=>applyDashboardPlan(context,plan([operation])));
 assert.equal(JSON.stringify(context),before);
 assert.throws(()=>validateEditorContext({...context,appearance:{daily:{rowData:[999]}}}));
 assert.throws(()=>validateAppearance({unknown:{legend:false}},widgets));
});

test('weekly data refresh preserves appearance history without reviving old data',async()=>{
 const {refreshEditorReportingPeriod}=await import('./dashboard-builder-history-refresh.ts');
 const {commitEditor}=await import('./ai-dashboard-editor.ts');
 const appearance={daily:{chartData:false},store:{caption:null},table:{tableLines:'both' as const}};
 const editor={...commitEditor(newEditor(workspace),{...workspace,appearance},'AI appearance'),defaultPeriod:range};
 const target={start:'2026-10-20',end:'2026-10-26'};
 const refreshed=await refreshEditorReportingPeriod(editor,target,async spec=>({...spec,snapshotId:'fresh',generatedAt:'now',warnings:[],widgets:spec.widgets.map(w=>({...w,range:target,rows:[{label:'Source',spend:777,revenue:777}],currency:'USD',timezone:'UTC',warnings:[]}))}));
 assert.deepEqual(refreshed.current.appearance,appearance);
 const undone=undoEditor(refreshed);assert.deepEqual(undone.current.report.range,target);assert.equal(undone.current.report.widgets[1].rows[0].revenue,777);assert.equal(undone.current.appearance,undefined);
 assert.deepEqual(redoEditor(undone).current.appearance,appearance);
});
