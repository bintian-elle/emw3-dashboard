import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testingChatChannel,testingChatSuggestions,testingScopeKey,validTestingChatScope} from './testing-chat-contract.ts';
const scope={channel:'meta' as const,campaign:'Wave 1',page:'/bluevua/testing/meta',period:{label:'Last Week (Tue–Mon)',start:'2026-10-13',end:'2026-10-19'}};
test('scope preserves exact campaign and dates, rejecting malformed scopes',()=>{
 assert.ok(validTestingChatScope(scope));
 for(const invalid of [{...scope,channel:'__proto__'},{...scope,page:'https://example.com'},{...scope,period:{...scope.period,start:'2026-02-30'}},{...scope,period:{...scope.period,end:'2026-10-12'}},{...scope,period:{...scope.period,concludedTestId:'../escape'}}])assert.equal(validTestingChatScope(invalid),false);
 assert.notEqual(testingScopeKey(scope),testingScopeKey({...scope,campaign:'Wave 2'}));
 assert.notEqual(testingScopeKey(scope),testingScopeKey({...scope,period:{...scope.period,end:'2026-10-20'}}));
});
test('every channel has three local bilingual suggestions without an AI call',()=>{
 for(const path of ['/bluevua/testing','/bluevua/testing/google/search','/bluevua/testing/google/pmax','/bluevua/testing/google/demand-gen','/bluevua/testing/meta','/bluevua/testing/reddit','/bluevua/testing/edm','/bluevua/testing/social','/bluevua/testing/concluded/google-search']){
  const channel=testingChatChannel(path),en=testingChatSuggestions(channel,false),zh=testingChatSuggestions(channel,true);
  assert.equal(en.length,3);assert.equal(zh.length,3);assert.equal(new Set(en).size,3);assert.ok(zh.every(q=>/[\u4e00-\u9fff]/.test(q)));
 }
 assert.notDeepEqual(testingChatSuggestions('meta',false),testingChatSuggestions('edm',false));
});
