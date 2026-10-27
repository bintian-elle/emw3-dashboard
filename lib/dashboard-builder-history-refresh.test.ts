import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshEditorReportingPeriod} from './dashboard-builder-history-refresh.ts';
import {newEditor,commitEditor,undoEditor,redoEditor,type Workspace} from './ai-dashboard-editor.ts';
import type {DashboardReport,ReportSpec} from './ai-dashboard.ts';
import {buildPageSummary} from './ai-dashboard-text.ts';
const old={start:'2026-10-20',end:'2026-10-26'},target={start:'2026-10-13',end:'2026-10-19'};
function workspace(range=old):Workspace{return{report:{title:'Brand overview',summary:'Overview',range,widgets:[{id:'spend',title:'Paid spend',kind:'metric',source:'google_ads',groupBy:'overview',metrics:['spend'],range,currency:'USD',timezone:'UTC',rows:[{label:'Total',spend:999}],warnings:[]}],snapshotId:'old',generatedAt:'old',warnings:[]},order:['spend'],hidden:[],colors:{}};}
function hydrator(calls:ReportSpec[]){return async(spec:ReportSpec):Promise<DashboardReport>=>{calls.push(spec);return{...spec,widgets:spec.widgets.map(widget=>({...widget,range:spec.range,currency:'USD',timezone:'UTC',rows:[{label:'Total',spend:42}],warnings:[]})),snapshotId:'fresh',generatedAt:'fresh',warnings:[]};};}
test('all user undo/redo snapshots receive current numbers while preserving presentation and redo',async()=>{
 let editor=newEditor(workspace());
 editor=commitEditor(editor,{...editor.current,hidden:['spend']},'Delete');
 editor=commitEditor(editor,{...editor.current,order:[],colors:{spend:{spend:'#ff0000'}}},'Order and color');
 editor=commitEditor(editor,{...editor.current,report:{...editor.current.report,widgets:editor.current.report.widgets.map(w=>({...w,title:'Custom title'}))}},'Rename');
 editor=undoEditor(editor);
 const calls:ReportSpec[]=[];
 let result=await refreshEditorReportingPeriod({...editor,defaultPeriod:old} as typeof editor,target,hydrator(calls));
 assert.equal(calls.length,1);assert.equal(calls[0].widgets.length,1);assert.equal('rows' in calls[0].widgets[0],false);
 assert.deepEqual(result.history.map(e=>e.label),['Delete','Order and color']);assert.equal(result.future[0].label,'Rename');
 assert.deepEqual(result.current.colors,{spend:{spend:'#ff0000'}});
 result=redoEditor(result);assert.equal(result.current.report.widgets[0].title,'Custom title');
 for(let i=0;i<4;i++){assert.deepEqual(result.current.report.range,target);assert.equal(result.current.report.widgets[0].rows[0].spend,42);result=undoEditor(result);}
});
test('legacy system entries disappear, stale summaries repair, custom periods stay untouched',async()=>{
 const before=workspace();before.texts=[{id:'summary',kind:'text',title:'Summary',content:buildPageSummary(before.report,[]),role:'summary',autoSummary:false}];
 const after={...structuredClone(before),report:{...before.report,range:target}};
 const custom=workspace({start:'2026-09-01',end:'2026-09-30'});
 const editor={...newEditor(after),history:[{label:'Updated Last Week',before,after},{label:'Custom September',before:after,after:custom}],future:[{label:'Updated Last Week',before,after},{label:'Manual note',before:after,after:{...after,texts:[{id:'note',kind:'text' as const,autoSummary:false,title:'Notes',content:'Keep my prose',role:'note' as const}]}}]};
 const result=await refreshEditorReportingPeriod(editor,target,hydrator([]));
 assert.deepEqual(result.history.map(e=>e.label),['Custom September']);assert.deepEqual(result.future.map(e=>e.label),['Manual note']);
 assert.deepEqual(result.history[0].after.report.range,custom.report.range);assert.equal(result.history[0].after.report.widgets[0].rows[0].spend,999);
 assert.equal(result.current.texts?.[0].autoSummary,true);assert.equal(result.current.texts?.[0].content,buildPageSummary(result.current.report,[]));
 assert.equal(result.future[0].after.texts?.[0].content,'Keep my prose');
});
test('empty reports refresh without queries and failed hydration leaves original intact',async()=>{
 const empty=workspace();empty.report.widgets=[];
 const editor={...newEditor(empty),defaultPeriod:old};let calls=0;
 const result=await refreshEditorReportingPeriod(editor,target,async()=>{calls++;throw Error('unexpected');});
 assert.equal(calls,0);assert.deepEqual(result.current.report.range,target);assert.equal(result.history.length,0);
 const full={...newEditor(workspace()),defaultPeriod:old};const frozen=JSON.stringify(full);
 await assert.rejects(refreshEditorReportingPeriod(full,target,async()=>{throw Error('failed');}));assert.equal(JSON.stringify(full),frozen);
});
