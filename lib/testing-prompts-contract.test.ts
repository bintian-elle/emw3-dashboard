import {test} from 'node:test';import assert from 'node:assert/strict';
import {currentPromptVersion,type PromptVersion,promptId,validatePromptEdit,validatePromptRun,validateTrialResult} from './testing-prompts-contract.ts';
test('catalog paths cannot be provided by a caller',()=>{assert.equal(promptId('google-search'),'google-search');assert.throws(()=>promptId('../../.env.local'));});
test('save requires a parent and meaningful change note',()=>{assert.throws(()=>validatePromptEdit({id:'meta',content:'x',note:'',parent:'base'}));assert.deepEqual(validatePromptEdit({id:'meta',content:'new',note:' Explain change ',parent:'source-ab'}),{id:'meta',content:'new',note:'Explain change',parent:'source-ab'});});
const run={mode:'analysis',start:'2026-10-27',end:'2026-11-02',campaign:'all',language:'zh',versions:{master:'source-a','google-search':'source-b',manual:'source-c',readability:'source-d'}};
test('trials reject invalid calendar dates and unrecorded prompt versions',()=>{assert.equal(validatePromptRun(run).mode,'analysis');assert.throws(()=>validatePromptRun({...run,start:'2026-02-30'}));assert.throws(()=>validatePromptRun({...run,versions:{}}));assert.throws(()=>validatePromptRun({...run,mode:'readability'}));});
const result={title:'Report',summary:'Decision',sections:[{title:'Evidence',markdown:'Facts'}],campaigns:[{id:'Campaign A',summary:'Summary',markdown:'Details'}],html:null};
test('report scope is exact and active presentation content is rejected',()=>{assert.deepEqual(validateTrialResult(result,['Campaign A']),result);assert.throws(()=>validateTrialResult(result,['Campaign B']));assert.throws(()=>validateTrialResult({...result,html:'<svg onload="alert(1)"/>'},['Campaign A']));assert.throws(()=>validateTrialResult({...result,html:'<script>x</script>'},['Campaign A']));assert.ok(validateTrialResult({...result,html:'<style>p{color:green}</style><p>Decision</p>'},['Campaign A']));});
test('every channel captures its own prompt and rejects mismatched scopes',()=>{
 for(const channel of ['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media','overview']){
  const versions=Object.fromEntries(['master','manual','readability','overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm','social-media'].map(id=>[id,'source-a']));
  assert.equal(validatePromptRun({...run,prompt:channel,channel,versions}).channel,channel);
 }
 assert.throws(()=>validatePromptRun({...run,prompt:'meta',channel:'google-search'}));
 assert.throws(()=>validatePromptRun({...run,compareStart:'2026-02-30',compareEnd:'2026-03-01'}));
});

test('a new source baseline supersedes an older saved revision without losing history',()=>{const source={id:'source-new',created_at:'2026-11-05T00:00:00Z'} as PromptVersion,saved={id:'saved-old',created_at:'2026-11-04T00:00:00Z'} as PromptVersion;assert.equal(currentPromptVersion(source,saved).id,'source-new');assert.equal(currentPromptVersion(source,{...saved,created_at:'2026-11-05T01:00:00Z'}).id,'saved-old');});
