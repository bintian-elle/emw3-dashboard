import test from 'node:test';
import assert from 'node:assert/strict';
import {updateTestingNotices} from './notifications.mjs';

test('failed delivery is retried and recovery is sent only after a failure was delivered',async()=>{
 const state={notifiedKeys:{},recoveredKeys:{},failureText:()=> 'failure',recoveryText:()=> 'recovered'};
 let saves=0;
 await assert.rejects(updateTestingNotices({items:state,failed:[['meta',{}]],recovered:[],send:async()=>{throw Error('offline');},save:async()=>{saves++;}}));
 assert.deepEqual(state.notifiedKeys,{});assert.equal(saves,0);
 const sent=[];
 await updateTestingNotices({items:state,failed:[['meta',{}]],recovered:[],send:async value=>sent.push(value),save:async()=>{saves++;}});
 assert.ok(state.notifiedKeys.meta);assert.equal(saves,1);
 await updateTestingNotices({items:state,failed:[],recovered:[['meta',{}]],send:async value=>sent.push(value),save:async()=>{saves++;}});
 assert.deepEqual(sent,['failure','recovered']);assert.ok(state.recoveredKeys.meta);assert.equal(saves,2);
});
