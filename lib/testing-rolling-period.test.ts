import assert from 'node:assert/strict';
import test from 'node:test';
import {rollingTestingPeriod} from './testing-rolling-period.ts';

const at=(value:string)=>new Date(value);

test('refreshes Last Week only when its actual Tuesday-to-Monday range changes',()=>{
 const monday=at('2026-10-26T23:59:59Z'),tuesday=at('2026-10-27T00:00:01Z'),wednesday=at('2026-10-28T00:00:01Z');
 assert.notEqual(rollingTestingPeriod('overview',null,monday),rollingTestingPeriod('overview',null,tuesday));
 assert.equal(rollingTestingPeriod('overview',null,tuesday),rollingTestingPeriod('overview',null,wednesday));
});

test('updates daily moving ranges and keeps applied custom and fixed pages unchanged',()=>{
 const before=at('2026-10-28T23:59:59Z'),after=at('2026-10-29T00:00:01Z');
 for(const preset of ['wtd','mtd','ytd','last7','last30','last90'])assert.notEqual(rollingTestingPeriod('meta',preset,before),rollingTestingPeriod('meta',preset,after),preset);
 assert.equal(rollingTestingPeriod('meta','custom',before),null);
 assert.equal(rollingTestingPeriod('meta','custom',after),null);
 assert.equal(rollingTestingPeriod('inventory',null,after),null);
 assert.equal(rollingTestingPeriod('social',null,after),null);
 assert.equal(rollingTestingPeriod(null,null,after),null);
});

test('Reddit lifetime changes at Chicago midnight rather than UTC midnight',()=>{
 const beforeUtc=at('2026-10-29T23:59:59Z'),afterUtc=at('2026-10-30T00:00:01Z');
 assert.equal(rollingTestingPeriod('reddit',null,beforeUtc),rollingTestingPeriod('reddit',null,afterUtc));
 const beforeChicago=at('2026-10-30T04:59:59Z'),afterChicago=at('2026-10-30T05:00:01Z');
 assert.notEqual(rollingTestingPeriod('reddit',null,beforeChicago),rollingTestingPeriod('reddit',null,afterChicago));
});
