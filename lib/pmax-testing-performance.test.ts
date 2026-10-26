import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pmaxMetrics,pmaxTestingDays,currentPmaxReadout,PMAX_TESTING_BASIS,fetchPmaxAssetPerformance,type PmaxDailyRow} from './pmax-testing-performance.ts';
const row=(date:string,spend:number,revenue:number,orders:number,impressions=100,clicks=10,group='1'):PmaxDailyRow=>({campaign:{id:'c'},assetGroup:{id:group},segments:{date},metrics:{costMicros:String(spend*1e6),conversionsValue:revenue,conversions:orders,impressions:String(impressions),clicks:String(clicks)}});
test('subtracts daily basic metrics, preserving fractional credit and recomputing rates',()=>{
 const net=pmaxTestingDays([row('2026-10-13',100,300,3.5)],[row('2026-10-13',40,100,1.5,40,4)]);
 const m=pmaxMetrics(net);assert.equal(m.spend,60);assert.equal(m.revenue,200);assert.equal(m.orders,2);assert.equal(m.roas,200/60);assert.equal(m.ctr,null);assert.equal(m.cpa,30);
});
test('confirmed 13–19 product-only case becomes zero, not an asset sum',()=>{
 const total=row('2026-10-19',32.61,525.07863826,.918082);
 const m=pmaxMetrics(pmaxTestingDays([total],[total]));assert.equal(m.spend,0);assert.equal(m.revenue,0);assert.equal(m.orders,0);assert.equal(m.roas,null);
});
test('subtraction matches date and group; subdivided parents must not be included',()=>{
 const net=pmaxTestingDays([row('2026-10-13',20,20,1),row('2026-10-14',30,40,2),row('2026-10-13',50,60,3,100,10,'2')],[row('2026-10-13',10,10,.5,30,3),row('2026-10-13',5,0,0,10,1)]);
 assert.deepEqual(net.map(r=>pmaxMetrics([r]).spend),[5,30,50]);
});
test('cannot silently clamp material negative or unmatched product data',()=>{
 assert.throws(()=>pmaxTestingDays([row('2026-10-13',1,0,0)],[row('2026-10-13',2,0,0)]),/reconciled/);
 assert.throws(()=>pmaxTestingDays([],[row('2026-10-13',2,0,0)]),/reconciled/);
});
test('old summaries are not shown alongside new PMax or Overview metrics',()=>{
 assert.equal(currentPmaxReadout({},'google-pmax'),false);assert.equal(currentPmaxReadout({},'overview'),false);assert.equal(currentPmaxReadout({},'meta'),true);assert.equal(currentPmaxReadout({metric_basis:{pmax:PMAX_TESTING_BASIS}},'overview'),true);
});
test('fetches all dates in two scoped queries and only product-tree roots',async()=>{
 const queries:string[]=[];await fetchPmaxAssetPerformance(async<T>(q:string)=>{queries.push(q);return [] as T[]},['123'],'2026-10-25');assert.equal(queries.length,2);assert.match(queries[0],/parent_listing_group_filter IS NULL/);assert.match(queries[1],/FROM asset_group_asset/);assert.ok(queries.every(q=>q.includes('asset_group.id IN (123)')));
});
