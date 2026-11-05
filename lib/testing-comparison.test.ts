import {matchComparisonRange} from './testing-comparison.ts';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {comparisonRange,matchTestingRange,periodOnPeriod,comparisonMetricValues} from './testing-comparison.ts';
test('previous comparison preserves inclusive duration across month boundary',()=>{assert.deepEqual(comparisonRange({start:'2026-11-01',end:'2026-11-03'},'previousPeriod','2026-11-03'),{start:'2026-10-29',end:'2026-10-31'});});
test('swapped preset dates are recognized instead of always becoming custom',()=>{assert.equal(matchTestingRange({start:'2026-10-27',end:'2026-11-02'},'2026-11-03'),'lastWeek');assert.equal(matchTestingRange({start:'2026-10-20',end:'2026-10-26'},'2026-11-03'),'custom');});
test('year comparison clamps leap dates',()=>assert.deepEqual(comparisonRange({start:'2024-02-29',end:'2024-02-29'},'previousYear','2026-11-03'),{start:'2023-02-28',end:'2023-02-28'}));
test('PoP handles missing and zero baselines without infinity or false growth',()=>{assert.equal(periodOnPeriod(10,0),null);assert.equal(periodOnPeriod(0,10),-1);assert.equal(periodOnPeriod(null,10),null);assert.equal(periodOnPeriod(120,100),.2);});
test('derived AOV uses period totals and missing metrics stay missing',()=>assert.deepEqual(comparisonMetricValues({revenue:100,orders:4,reach:null,name:'x'}),{revenue:100,orders:4,reach:null,aov:25}));
test('selecting a preset comparison uses exactly its own dates',()=>assert.deepEqual(comparisonRange({start:'2026-10-20',end:'2026-10-26'},'lastWeek','2026-11-03'),{start:'2026-10-27',end:'2026-11-02'}));
test('custom comparison remains independent of the reporting period',()=>assert.deepEqual(comparisonRange({start:'2026-10-20',end:'2026-10-26'},'custom','2026-11-03',{start:'2026-09-01',end:'2026-09-30'}),{start:'2026-09-01',end:'2026-09-30'}));


test('trial comparison recognizes the previous week as PoP instead of custom',()=>{
 const current={start:'2026-10-27',end:'2026-11-02'},previous={start:'2026-10-20',end:'2026-10-26'};
 assert.equal(matchComparisonRange(current,previous,'2026-11-03'),'previousPeriod');
 assert.equal(matchComparisonRange(current,{start:'2025-10-27',end:'2025-11-02'},'2026-11-03'),'previousYear');
});
