import assert from 'node:assert/strict';
import test from 'node:test';
import {acceptReadoutColdResult,expectedReadoutVersionsMatch,reconcileReadoutMemory,type ReadoutMemory,type ReadoutVersion} from './testing-readout-reconcile-model.ts';

type Row={cache_key:string;updated_at:string;source:string;value:string};
const key='period:last-week-tue-mon:2026-10-20:2026-10-26';
const v1='2026-10-20T00:00:00.000Z',v2='2026-10-21T00:00:00.000Z';
const row=(date:string,source='h1'):Row=>({cache_key:key,updated_at:date,source,value:date});
const metadata=(date:string|null,translationAt:string|null=null,sourceHash:string|null=null):ReadoutVersion=>({key,updatedAt:date,translationAt,sourceHash});
const translationKey=(source:string)=>`${key}\u0000zh\u0000${source}`;
const empty=():ReadoutMemory<Row>=>({records:new Map(),translations:new Map(),translationVersions:new Map()});
function apply(state:ReadoutMemory<Row>,version:ReadoutVersion,options:{language?:'en'|'zh';expected?:unknown;loadMissing?:boolean;records?:Row[];translation?:Row|null;fail?:boolean}={}){
 return reconcileReadoutMemory(state,{keys:[key],language:options.language??'en',versions:[version],expected:options.expected,loadMissing:options.loadMissing,
  loadRecords:async()=>{if(options.fail)throw Error('database unavailable');return options.records??[];},
  loadTranslation:async()=>options.translation??null,sourceHash:record=>record.source});
}

test('cold metadata is lightweight, and the first publication loads only when required',async()=>{
 const state=empty(),version=metadata(v1);
 await apply(state,version);assert.equal(state.records.size,0);
 await apply(state,version,{expected:[version],loadMissing:true,records:[row(v1)]});
 assert.equal(state.records.get(key)?.updated_at,v1);
});

test('only translations matching the current source hash remain cached',async()=>{
 const state=empty(),source=row(v1,'h1');state.records.set(key,source);
 state.translations.set(translationKey('h1'),{...source,value:'old translation'});
 state.translationVersions.set(translationKey('h1'),v1);
 await apply(state,metadata(v1,v2,'other'),{language:'zh'});
 assert.equal(state.translations.size,0);assert.equal(state.records.get(key),source);
 state.translations.set(translationKey('h1'),{...source,value:'old translation'});
 await apply(state,metadata(v1,null,null),{language:'zh'});
 assert.equal(state.translations.size,0);
});

test('failed reads or missing translations preserve the complete prior cache',async()=>{
 const state=empty(),old=row(v1,'h1');state.records.set(key,old);
 const oldTranslation={...old,value:'中文'};state.translations.set(translationKey('h1'),oldTranslation);state.translationVersions.set(translationKey('h1'),v1);
 await assert.rejects(apply(state,metadata(v2,v2,'h2'),{language:'zh',records:[row(v2,'h2')],loadMissing:true,translation:null}));
 assert.equal(state.records.get(key),old);assert.equal(state.translations.get(translationKey('h1')),oldTranslation);
 await assert.rejects(apply(state,metadata(v2),{fail:true}));
 assert.equal(state.records.get(key),old);
});

test('confirmed source deletion removes it and rollback restores the authoritative version',async()=>{
 const state=empty(),newer=row(v2);state.records.set(key,newer);state.translations.set(translationKey('h1'),newer);
 await apply(state,metadata(v1),{records:[row(v1)]});assert.equal(state.records.get(key)?.updated_at,v1);
 await apply(state,metadata(null));assert.equal(state.records.size,0);assert.equal(state.translations.size,0);
});

test('another instance must reach the expected version before serving its cached data',async()=>{
 const state=empty(),old=row(v1);state.records.set(key,old);
 const target=metadata(v2,v2,'h2');
 assert.equal(expectedReadoutVersionsMatch([key],'zh',[metadata(v1)],[target]),false);
 await assert.rejects(apply(state,metadata(v1),{language:'zh',expected:[target],loadMissing:true}));assert.equal(state.records.get(key),old);
 const targetRow=row(v2,'h2'),translated={...targetRow,value:'新版中文'};
 await apply(state,target,{language:'zh',expected:[target,{...metadata(v1),key:'period:social-lifetime'}],loadMissing:true,records:[targetRow],translation:translated});
 assert.equal(state.records.get(key),targetRow);assert.equal(state.translations.get(translationKey('h2')),translated);
 assert.equal(expectedReadoutVersionsMatch([key],'en',[metadata(v2)],[target]),true);
});

test('a translation inserted by another request is never overwritten by an older in-flight read',async()=>{
 const state=empty(),source=row(v1);state.records.set(key,source);
 let resolveTranslation!:(value:Row|null)=>void;
 const slow=new Promise<Row|null>(resolve=>{resolveTranslation=resolve;});
 const pending=reconcileReadoutMemory(state,{keys:[key],language:'zh',versions:[metadata(v1,v1,'h1')],loadMissing:true,
  loadRecords:async()=>[],loadTranslation:async()=>slow,sourceHash:record=>record.source});
 const newer={...source,value:'new translation'};
 state.translations.set(translationKey('h1'),newer);state.translationVersions.set(translationKey('h1'),v2);
 resolveTranslation({...source,value:'older translation'});
 await assert.rejects(pending,/changed during reconciliation/);
 assert.equal(state.translations.get(translationKey('h1')),newer);assert.equal(state.translationVersions.get(translationKey('h1')),v2);
});

test('a confirmed deletion or rollback rejects a stale in-flight cold read',()=>{
 assert.equal(acceptReadoutColdResult(1,1,undefined,v2),true);
 assert.equal(acceptReadoutColdResult(1,2,null,v2),false);
 assert.equal(acceptReadoutColdResult(1,2,v1,v2),false);
 assert.equal(acceptReadoutColdResult(1,2,v1,v1),true);
});
