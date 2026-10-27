import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingPeriod} from './website-tracking.ts';
import {previousTrackingPeriod,collectionMetrics,visitorRate,trackingDelta,collectionTrend,collectionPathFilter} from './website-tracking-metrics.ts';
const report=(value:number)=>({rows:[{dimensions:[],metrics:[value]}],warnings:[]});
test('default is thirty complete property-time-zone days and prior period is equal length',()=>{
 const period=trackingPeriod({},new Date('2026-10-26T18:00:00Z'));
 assert.deepEqual(period,{start:'2026-09-26',end:'2026-10-25'});
 assert.deepEqual(previousTrackingPeriod(period),{start:'2026-08-27',end:'2026-09-25'});
 assert.deepEqual(previousTrackingPeriod({start:'2024-03-01',end:'2024-03-01'}),{start:'2024-02-29',end:'2024-02-29'});
});
test('visitor click rate uses unique clickers and visitors, and refuses unavailable or inconsistent populations',()=>{
 assert.deepEqual(collectionMetrics({visitors:report(200),clicks:report(15)}),{visitors:200,clickers:15,rate:0.075});
 assert.equal(visitorRate(0,200),0);assert.equal(visitorRate(10,0),null);assert.equal(visitorRate(201,200),null);
 assert.equal(collectionMetrics(undefined).rate,null);
 assert.equal(collectionMetrics({visitors:{...report(200),error:'unavailable'},clicks:report(15)}).rate,null);
 assert.equal(collectionMetrics({visitors:{...report(200),warnings:['GA4 returned sampled data.']},clicks:report(15)}).rate,null);
});
test('rate changes are percentage points; count growth with zero baseline is unavailable',()=>{
 assert.equal(trackingDelta(0.075,0.05,true),'+2.5 pp');
 assert.equal(trackingDelta(120,100),'+20.0%');
 assert.equal(trackingDelta(120,0),'No comparison');assert.equal(trackingDelta(null,100),'No comparison');
});
test('collection filter includes localized collections but excludes compare and product pages',()=>{
 const regex=new RegExp(collectionPathFilter.filter.stringFilter.value);
 for(const path of ['/collections/shop-all','/de-de/collections/countertop-ro-system'])assert.ok(regex.test(path));
 for(const path of ['/products/compare','/products/collection-model','/pages/collections-guide'])assert.equal(regex.test(path),false);
});
test('daily series fills absent days only in complete reports and never becomes the period unique-user denominator',()=>{
 const daily={rows:[{dimensions:['20261024','page_view'],metrics:[20]},{dimensions:['20261024','compare_click'],metrics:[2]}],warnings:[]};
 assert.deepEqual(collectionTrend(daily,{start:'2026-10-24',end:'2026-10-25'}),{dates:['2026-10-24','2026-10-25'],visitors:[20,0],clickers:[2,0]});
 assert.equal(collectionTrend({...daily,error:'failed'},{start:'2026-10-24',end:'2026-10-25'}),null);
});
