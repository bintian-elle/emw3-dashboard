import test from 'node:test';
import assert from 'node:assert/strict';
import {runDailyStages} from './daily-stages.mjs';
test('all periods publish before translation, even when translation fails',async()=>{
 const events=[];
 const result=await runDailyStages({presets:['wtd','mtd'],generate:async p=>{events.push(p);},concluded:async()=>events.push('concluded'),translate:async()=>{events.push('translation');throw Error('bad translation');}});
 assert.deepEqual(events,['wtd','mtd','concluded','translation']);
 assert.deepEqual(result.errors,[{stage:'translation',error:'bad translation'}]);
});
test('a failed period does not block other periods or translation of saved English',async()=>{
 const events=[];
 const result=await runDailyStages({presets:['wtd','mtd'],generate:async p=>{events.push(p);if(p==='wtd')throw Error('generation failed');},concluded:async()=>{throw Error('concluded failed');},translate:async()=>events.push('translation')});
 assert.deepEqual(events,['wtd','mtd','translation']);
 assert.deepEqual(result.errors.map(e=>e.stage),['analysis:wtd','concluded']);
});
