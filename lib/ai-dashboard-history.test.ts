import {test} from 'node:test';import assert from 'node:assert/strict';
import {recordLayoutChange,undoLayoutChange,redoLayoutChange,commitLayoutChange,type LayoutState} from './ai-dashboard-history.ts';
const initial:LayoutState={order:['a','b','c'],hidden:[]};
test('two deletes can be undone independently in reverse order',()=>{
 const first={...initial,hidden:['a']},second={...initial,hidden:['a','b']};
 let history=recordLayoutChange([],initial,first,'Removed A');history=recordLayoutChange(history,first,second,'Removed B');
 const one=undoLayoutChange(second,history);assert.deepEqual(one.layout,first);assert.equal(one.history.length,1);
 const two=undoLayoutChange(one.layout,one.history);assert.deepEqual(two.layout,initial);assert.equal(two.history.length,0);
});
test('mixed drag and delete history restores every prior layout and ignores no-op drags',()=>{
 const moved={order:['c','a','b'],hidden:[]},deleted={...moved,hidden:['a']};
 let history=recordLayoutChange([],initial,moved,'Moved C');history=recordLayoutChange(history,moved,deleted,'Removed A');
 assert.equal(recordLayoutChange(history,deleted,deleted,'No move').length,2);
 let result=undoLayoutChange(deleted,history);assert.deepEqual(result.layout,moved);result=undoLayoutChange(result.layout,result.history);assert.deepEqual(result.layout,initial);
 assert.deepEqual(undoLayoutChange(initial,[]).layout,initial);
});
test('history captures immutable snapshots and survives JSON persistence',()=>{
 const before={order:['a','b'],hidden:[] as string[]},after={order:['b','a'],hidden:[] as string[]};
 const history=recordLayoutChange([],before,after,'Moved B');before.order.reverse();after.hidden.push('a');
 const restored=JSON.parse(JSON.stringify(history));assert.deepEqual(undoLayoutChange(after,restored).layout,{order:['a','b'],hidden:[]});
});

test('redo replays mixed delete and drag operations in original order',()=>{
 const moved={order:['c','a','b'],hidden:[]},deleted={...moved,hidden:['a']};
 let history=recordLayoutChange([],initial,moved,'Moved C');history=recordLayoutChange(history,moved,deleted,'Removed A');
 let state=undoLayoutChange(deleted,history);state=undoLayoutChange(state.layout,state.history,state.future);
 assert.equal(state.future.length,2);
 state=redoLayoutChange(state.layout,state.history,state.future);assert.deepEqual(state.layout,moved);
 state=redoLayoutChange(state.layout,state.history,state.future);assert.deepEqual(state.layout,deleted);assert.equal(state.future.length,0);assert.equal(state.history.length,2);
});
test('a new operation clears redo while no-op changes preserve it',()=>{
 const moved={order:['c','a','b'],hidden:[]};const history=recordLayoutChange([],initial,moved,'Moved C');const undone=undoLayoutChange(moved,history);
 const noop=commitLayoutChange(undone.layout,undone.history,undone.future,undone.layout,'No move');assert.equal(noop.future.length,1);
 const branch=commitLayoutChange(undone.layout,undone.history,undone.future,{...initial,hidden:['b']},'Removed B');assert.equal(branch.future.length,0);assert.equal(branch.history.length,1);
 assert.deepEqual(redoLayoutChange(initial,[],[]).layout,initial);
});
test('redo stack survives JSON persistence and does not mutate saved snapshots',()=>{
 const after={order:['b','a','c'],hidden:['c']};const history=recordLayoutChange([],initial,after,'Changed layout');const undone=undoLayoutChange(after,history);
 const saved=JSON.parse(JSON.stringify(undone));const redone=redoLayoutChange(saved.layout,saved.history,saved.future);redone.layout.hidden.push('a');
 assert.deepEqual(saved.future[0].after.hidden,['c']);assert.deepEqual(redone.history[0].after.hidden,['c']);
});
