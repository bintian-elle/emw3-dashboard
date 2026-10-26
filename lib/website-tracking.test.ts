import test from 'node:test';
import assert from 'node:assert/strict';
import { trackingPeriod, trackingFilter, eventRate } from './website-tracking.ts';
test('validates real calendar dates and ordered ranges',()=>{
 assert.throws(()=>trackingPeriod({start:'2026-02-30',end:'2026-03-01'}));
 assert.throws(()=>trackingPeriod({start:'2026-10-25',end:'2026-10-01'}));
 assert.deepEqual(trackingPeriod({start:'2026-10-01',end:'2026-10-20'}),{start:'2026-10-01',end:'2026-10-20'});
});
test('production hostname filter always applies and devices are allowlisted',()=>{
 const all=trackingFilter('all');
 assert.equal(all.andGroup.expressions[0].filter.fieldName,'hostName');
 assert.deepEqual(all.andGroup.expressions[0].filter.inListFilter?.values,['bluevua.com','www.bluevua.com']);
 assert.equal(trackingFilter('mobile').andGroup.expressions.length,2);
 assert.throws(()=>trackingFilter('bot'));
});
test('zero denominator is unavailable, not zero percent',()=>{
 assert.equal(eventRate(1,0),null);assert.equal(eventRate(3,10),0.3);
});

test('reads complete JSONL exports rather than only the ten-row CLI preview',async()=>{
 const {parseTrackingExport}=await import('./website-tracking.ts');
 assert.deepEqual(parseTrackingExport('{"eventCount":"10"}\n{"eventCount":"20"}\n'),[{eventCount:'10'},{eventCount:'20'}]);
 assert.deepEqual(parseTrackingExport('[{"eventCount":"10"}]'),[{eventCount:'10'}]);
 assert.throws(()=>parseTrackingExport('{"data":"invalid"}'));
});
test('excludes the CLI JSONL metadata header from metric rows',async()=>{
 const {parseTrackingExport}=await import('./website-tracking.ts');
 assert.deepEqual(parseTrackingExport('{"metadata":{"account_ref":"ga4.bluevua"}}\n{"eventCount":"10"}\n'),[{eventCount:'10'}]);
});
test('overall unique users come from an ungrouped query, never a device sum',async()=>{
 const {trackingOverviewRequests}=await import('./website-tracking.ts');
 const all=trackingOverviewRequests('all');
 assert.deepEqual(all.overall.dimensions,[]);
 assert.deepEqual(all.overall.metrics,['totalUsers','eventCount','addToCarts','ecommercePurchases']);
 assert.deepEqual(all.devices?.dimensions,['deviceCategory']);
 assert.deepEqual(all.overall.dimensionFilter,trackingFilter('all'));
 const mobile=trackingOverviewRequests('mobile');
 assert.equal(mobile.devices,undefined);
 assert.deepEqual(mobile.overall.dimensionFilter,trackingFilter('mobile'));
});
test('device shares use event counts, preserve unknown categories and handle zero events',async()=>{
 const {trackingDeviceShares}=await import('./website-tracking.ts');
 const rows=[{dimensions:['desktop'],metrics:[5,60,1,0]},{dimensions:['mobile'],metrics:[6,30,1,0]},{dimensions:['other'],metrics:[2,10,0,0]}];
 assert.deepEqual(trackingDeviceShares(rows).map(r=>r.share),[0.6,0.3,0.1]);
 assert.equal(trackingDeviceShares([{dimensions:['tablet'],metrics:[1,0,0,0]}])[0].share,0);
 assert.deepEqual(trackingDeviceShares([]),[]);
});
test('browser reload clears tracking filters but ordinary navigation preserves them',async()=>{
 const {trackingReloadTarget}=await import('./website-tracking.ts');
 const url='https://dashboard.example/bluevua/tracking?start=2026-10-01&end=2026-10-14&device=mobile#actions';
 assert.equal(trackingReloadTarget({type:'reload',name:url},url),'/bluevua/tracking');
 assert.equal(trackingReloadTarget({type:'navigate',name:url},url),null);
 assert.equal(trackingReloadTarget({type:'back_forward',name:url},url),null);
 assert.equal(trackingReloadTarget(undefined,url),null);
 assert.equal(trackingReloadTarget({type:'reload',name:'https://dashboard.example/bluevua'},url),null);
 assert.equal(trackingReloadTarget({type:'reload',name:'https://dashboard.example/bluevua/tracking?device=desktop'},url),null);
 assert.equal(trackingReloadTarget({type:'reload',name:'https://dashboard.example/bluevua/tracking'},'https://dashboard.example/bluevua/tracking'),null);
});
