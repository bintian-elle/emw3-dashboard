import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fetchTestingPeriod} from './testing-scoped-fetch.ts';

test('fetches only the intersection of the report period and test start',async()=>{
 const seen:Array<{start:string;end:string}>=[];
 const result=await fetchTestingPeriod({channel:'reddit',current:{start:'2026-09-01',end:'2026-09-30'},previous:{start:'2026-08-01',end:'2026-08-31'},period:'current'},async range=>{seen.push(range);return {period:range};});
 assert.deepEqual(seen,[{start:'2026-09-24',end:'2026-09-30'}]);assert.deepEqual(result,{period:{start:'2026-09-24',end:'2026-09-30'}});
});
test('never calls provider for a period before testing',async()=>{
 let called=false;
 const result=await fetchTestingPeriod({channel:'meta',current:{start:'2026-09-01',end:'2026-09-30'},previous:null,period:'current'},async range=>{called=true;return {period:range};});
 assert.equal(result,null);assert.equal(called,false);
});
test('rejects provider results labelled with a different date range',async()=>{
 await assert.rejects(()=>fetchTestingPeriod({channel:'meta',current:{start:'2026-10-12',end:'2026-10-18'},previous:null,period:'current'},async()=>({period:{start:'2026-10-01',end:'2026-10-18'}})),/period mismatch/);
});

test('report-bound gateway permits only current and previous selectors',async()=>{
 const {createTestingDataGateway}=await import('./testing-scoped-fetch.ts');
 const seen:Array<{start:string;end:string}>=[];
 const gateway=createTestingDataGateway({channel:'reddit',current:{start:'2026-09-01',end:'2026-09-30'},previous:{start:'2026-08-01',end:'2026-08-31'}},async range=>{seen.push(range);return {period:range};});
 assert.deepEqual(await gateway('current'),{period:{start:'2026-09-24',end:'2026-09-30'}});
 assert.equal(await gateway('previous'),null);
 await assert.rejects(()=>gateway('all' as never),/Invalid period selector/);
 assert.deepEqual(seen,[{start:'2026-09-24',end:'2026-09-30'}]);
});
