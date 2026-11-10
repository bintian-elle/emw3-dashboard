import {test} from 'node:test';import assert from 'node:assert/strict';
import {promptRunRouting} from './testing-prompt-run-policy.ts';
import {reviewLocalPromptQueueEnabled} from './testing-prompt-run-policy.ts';
test('local development and local production previews use a local trial queue',()=>{
 assert.equal(reviewLocalPromptQueueEnabled({NODE_ENV:'development'}),true);
 assert.equal(reviewLocalPromptQueueEnabled({NODE_ENV:'production',LOCAL_PRODUCTION_PREVIEW:'1'}),true);
 assert.equal(reviewLocalPromptQueueEnabled({NODE_ENV:'production'}),false);
});
test('Overview private discussions never resolve channel insights or appear as saved trials',()=>{for(const local of [true,false])assert.deepEqual(promptRunRouting('overview',{chat:{question:'Discuss my private draft'}},local),{queue:'shared',visibleTrial:false,overviewSources:false});});
test('private Search discussions also retain their existing chat transport in local development',()=>assert.deepEqual(promptRunRouting('google-search',{chat:{question:'Private question'}},true),{queue:'shared',visibleTrial:false,overviewSources:false}));
test('actual Overview previews use local or hosted trial storage and can reuse channel reports',()=>{assert.deepEqual(promptRunRouting('overview',{campaigns:[]},true),{queue:'local',visibleTrial:true,overviewSources:true});assert.deepEqual(promptRunRouting('overview',{campaigns:[]},false),{queue:'shared',visibleTrial:true,overviewSources:true});});
test('ordinary channel previews remain visible without invoking Overview synthesis',()=>assert.deepEqual(promptRunRouting('google-pmax',{campaigns:['PMax']},true),{queue:'local',visibleTrial:true,overviewSources:false}));
