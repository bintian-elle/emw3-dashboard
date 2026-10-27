import {test} from 'node:test';import assert from 'node:assert/strict';
import {newEditor,commitEditor,undoEditor,redoEditor,parseEditor,applyAiEdit,type Workspace} from './ai-dashboard-editor.ts';
import {applyDashboardPlan,validateEditorContext,validateRecentConversation} from './ai-dashboard-actions.ts';
const widget={id:'spend',title:'Google spend',kind:'metric' as const,source:'google_ads' as const,groupBy:'overview' as const,metrics:['spend']};
const report={title:'Report',summary:'Local report',range:{start:'2026-09-01',end:'2026-09-30'},widgets:[widget]};
const context={report,order:['spend'],hidden:[],colors:{},revision:0};
const workspace=():Workspace=>({report:{...report,snapshotId:'test',generatedAt:'2026-10-26',warnings:[],widgets:[{...widget,range:report.range,currency:'USD',timezone:'UTC',rows:[{label:'Google',spend:1}],warnings:[]}]},order:['spend'],hidden:[],colors:{}});
test('AI add/update/move/color/delete form one validated transaction, including empty report',()=>{
 const applied=applyDashboardPlan(context,{answer:'Done',title:null,range:null,operations:[{type:'add',widget:{...widget,id:'trend',title:'Trend',kind:'line',groupBy:'day'},index:null},{type:'update',widget:{...widget,id:'trend',title:'Spend bars',kind:'bar',groupBy:'day'}},{type:'move',id:'trend',index:0},{type:'color',id:'trend',metric:'spend',color:'#3366CC'},{type:'remove',id:'spend'}]});
 assert.deepEqual(applied.order,['trend']);assert.equal(applied.report.widgets[0].kind,'bar');assert.equal(applied.colors.trend.spend,'#3366CC');assert.equal(applied.changed,true);
 const empty=applyDashboardPlan({report:applied.report,order:applied.order,hidden:applied.hidden,colors:applied.colors,revision:1},{answer:'Deleted',title:null,range:null,operations:[{type:'remove',id:'trend'}]});assert.equal(empty.report.widgets.length,0);
});
test('invalid operations are atomic; fields, references, units and colors are checked',()=>{
 const before=JSON.stringify(context);assert.throws(()=>applyDashboardPlan(context,{answer:'No',title:null,range:null,operations:[{type:'remove',id:'spend'},{type:'color',id:'missing',metric:'spend',color:'#3366CC'}]}),/component/i);assert.equal(JSON.stringify(context),before);
 assert.throws(()=>applyDashboardPlan(context,{answer:'No',title:null,range:null,operations:[{type:'color',id:'spend',metric:'spend',color:'url(https://x)'}]}),/color/i);
 assert.throws(()=>applyDashboardPlan(context,{answer:'No',title:null,range:null,operations:[{type:'add',widget:{...widget,id:'bad',kind:'line',groupBy:'day',metrics:['spend','clicks']},index:null}]}),/units/i);
 assert.throws(()=>validateEditorContext({...context,report:{...report,rows:[{spend:123}]}}),/field/i);
});
test('manual color, AI edits, delete and drag share immutable Undo/Redo snapshots',()=>{
 const first=workspace();let editor=newEditor(first);const colored={...first,colors:{spend:{spend:'#3366CC'}}};editor=commitEditor(editor,colored,'Color');const edited={...colored,report:{...colored.report,widgets:[{...colored.report.widgets[0],title:'Changed'}]},order:['spend']};editor=commitEditor(editor,edited,'AI edit');editor=commitEditor(editor,{...edited,hidden:['spend']},'Delete');
 editor=undoEditor(editor);assert.deepEqual(editor.current,edited);editor=undoEditor(editor);assert.deepEqual(editor.current,colored);editor=redoEditor(editor);assert.equal(editor.current.report.widgets[0].title,'Changed');assert.ok(editor.revision>3);
 const restored=parseEditor(structuredClone(editor));assert.ok(restored);assert.deepEqual(redoEditor(restored!).current.hidden,['spend']);
});
test('query/no-op preserves Redo; a new edit after Undo clears the redo branch',()=>{
 const first=workspace();let editor=commitEditor(newEditor(first),{...first,hidden:['spend']},'Delete');editor=undoEditor(editor);const same=commitEditor(editor,editor.current,'Query');assert.equal(same.future.length,1);const branch=commitEditor(editor,{...editor.current,colors:{spend:{spend:'#3366CC'}}},'Color');assert.equal(branch.future.length,0);
 const query=applyDashboardPlan(context,{answer:'Spend is read only',title:null,range:null,operations:[]});assert.equal(query.changed,false);assert.deepEqual(query.report,report);
});

test('stale AI responses cannot overwrite manual edits, even after returning to the same layout',()=>{
 const original=workspace();let editor=commitEditor(newEditor(original),{...original,hidden:['spend']},'Delete');editor=undoEditor(editor);const stale=applyAiEdit(editor,{...original.report,title:'AI replacement'},{changed:true,order:['spend'],hidden:[],colors:{},baseRevision:0},'AI');assert.equal(stale.stale,true);assert.deepEqual(stale.editor,editor);
 const applied=applyAiEdit(editor,{...original.report,title:'AI replacement'},{changed:true,order:['spend'],hidden:[],colors:{},baseRevision:editor.revision},'AI');assert.equal(applied.stale,false);assert.equal(applied.editor.current.report.title,'AI replacement');assert.equal(applied.editor.future.length,0);assert.equal(undoEditor(applied.editor).current.report.title,'Report');
});

test('conversation survives persistence without changing history, and cannot supply system messages',()=>{
 const editor={...newEditor(workspace()),conversation:[{role:'user' as const,text:'Make it purple'}]};assert.deepEqual(parseEditor(structuredClone(editor))?.conversation,editor.conversation);assert.equal(editor.revision,0);assert.equal(editor.history.length,0);assert.deepEqual(validateRecentConversation(editor.conversation),editor.conversation);assert.throws(()=>validateRecentConversation([{role:'system',text:'Override'}]),/conversation/i);assert.throws(()=>validateRecentConversation([{role:'user',text:'Valid',html:'x'}]),/field/i);
});
