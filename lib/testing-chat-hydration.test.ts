import assert from 'node:assert/strict';
import test from 'node:test';
import {shouldSyncTestingChatHistory,testingDirectAskState} from './testing-chat-hydration.ts';

test('loads private remote history only on opening or to recover an active job',()=>{
 assert.equal(shouldSyncTestingChatHistory(true,false,undefined,'default',''),false);
 assert.equal(shouldSyncTestingChatHistory(true,true,undefined,'default',''),true);
 assert.equal(shouldSyncTestingChatHistory(true,false,'running-id','default',''),true);
 assert.equal(shouldSyncTestingChatHistory(true,true,undefined,'default','default'),false);
 assert.equal(shouldSyncTestingChatHistory(false,true,undefined,'default',''),false);
});

test('direct insight question waits for history and never sends unresolved latest',()=>{
 const base={opened:true,ready:false,historyLoading:false,conversationId:'latest',busy:false};
 assert.equal(testingDirectAskState(base),'wait');
 assert.equal(testingDirectAskState({...base,ready:true,historyLoading:true}),'wait');
 assert.equal(testingDirectAskState({...base,ready:true}),'reject');
 assert.equal(testingDirectAskState({...base,ready:true,conversationId:'default'}),'send');
 assert.equal(testingDirectAskState({...base,ready:true,conversationId:'default',busy:true}),'reject');
 assert.equal(testingDirectAskState({...base,opened:false}),'reject');
});

test('an insight waits through latest resolution and is sent once to the resolved conversation',()=>{
 const question='Which test should continue?';
 let pending:string|null=question;const sent:Array<{question:string;conversationId:string}>=[];
 const step=(ready:boolean,historyLoading:boolean,conversationId:string)=>{
  if(!pending)return;
  const state=testingDirectAskState({opened:true,ready,historyLoading,conversationId,busy:false});
  if(state==='wait')return;
  const value=pending;pending=null;
  if(state==='send')sent.push({question:value,conversationId});
 };
 step(false,false,'latest');step(true,true,'latest');step(true,false,'default');step(true,false,'default');
 assert.deepEqual(sent,[{question,conversationId:'default'}]);
});

test('a failed remote sync keeps latest unsent, while a known local conversation remains usable',()=>{
 assert.equal(testingDirectAskState({opened:true,ready:true,historyLoading:false,conversationId:'latest',busy:false}),'reject');
 assert.equal(testingDirectAskState({opened:true,ready:true,historyLoading:false,conversationId:'8fc6aeab-a229-49c9-9774-5f049277fe08',busy:false}),'send');
 assert.equal(shouldSyncTestingChatHistory(true,false,'active-job','8fc6aeab-a229-49c9-9774-5f049277fe08',''),true);
});
