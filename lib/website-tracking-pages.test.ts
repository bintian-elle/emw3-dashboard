import test from 'node:test';
import assert from 'node:assert/strict';
import {trackingEventDefinitions,trackingPageScope,pagePathIsPublic,pageFilter,pageEventValue,pageVisitorRate,pageFeatureValue,pageDailySeries,trackingPageHref,pageEventNames} from './website-tracking-pages.ts';
const period={start:'2026-09-26',end:'2026-10-25'};
const report=(rows:Array<{dimensions:string[];metrics:number[]}>=[])=>({rows,warnings:[]});
test('manifest contains all 27 normal events, while preserving a separate unknown-event path',()=>{
 assert.equal(trackingEventDefinitions.length,27);assert.equal(new Set(trackingEventDefinitions.map(x=>x.event)).size,27);
 for(const event of ['purchase','form_submit','video_start','video_progress','video_complete','compare_click'])assert.ok(trackingEventDefinitions.some(x=>x.event===event));
});
test('page scopes separate localized PDP/Compare, preserve fixed hosts and device, and protect private URLs',()=>{
 assert.deepEqual(trackingPageScope(),{page:'collection',path:''});
 assert.equal(trackingPageScope('pdp','/de-de/products/ropot').path,'/de-de/products/ropot');
 assert.throws(()=>trackingPageScope('pdp','/products/compare'));
 assert.throws(()=>trackingPageScope('collection','https://other.test/collections/x'));
 for(const path of ['/account/activate/123/secret','/checkouts/private-token','/account/orders/123','/products/x?email=private','/products/../account'])assert.equal(pagePathIsPublic(path),false);
 assert.equal(pagePathIsPublic('/account/login'),true);
 const filter=pageFilter(trackingPageScope('collection'), 'mobile');
 assert.ok(JSON.stringify(filter).includes('bluevua.com'));assert.ok(JSON.stringify(filter).includes('deviceCategory'));
 assert.ok(JSON.stringify(pageFilter(trackingPageScope('pdp'),'all')).includes('notExpression'));
 assert.ok(!JSON.stringify(pageFilter(trackingPageScope('cart'),'all')).includes('pagePath'));
});
test('visitor percentages use period users, never event totals or daily/user sums',()=>{
 const data=report([{dimensions:['page_view'],metrics:[1000,100]},{dimensions:['compare_click'],metrics:[40,15]}]);
 assert.equal(pageVisitorRate(pageEventValue(data,'compare_click').users,pageEventValue(data,'page_view').users),0.15);
 assert.equal(pageVisitorRate(15,0),null);assert.equal(pageVisitorRate(101,100),null);
 assert.equal(pageEventValue({...data,error:'offline'},'compare_click').users,null);
 assert.equal(pageEventValue(data,'video_start').users,0);
});
test('operation tuples and users are exact, not aggregated over success/error or repeated dimensions',()=>{
 const data=report([{dimensions:['cart_feature_result','promo_code','apply','success'],metrics:[10,6]},{dimensions:['cart_feature_result','promo_code','apply','error'],metrics:[5,4]}]);
 assert.equal(pageFeatureValue(data,'promo_code','cart_feature_result','apply','success').users,6);
 assert.equal(pageFeatureValue(data,'promo_code','cart_feature_result','apply').users,null);
});
test('daily click rate preserves zero denominator gaps and exact page/device URLs',()=>{
 const daily=report([{dimensions:['20260926','page_view'],metrics:[10,4]},{dimensions:['20260926','compare_click'],metrics:[2,1]}]);
 const series=pageDailySeries(daily,{start:'2026-09-26',end:'2026-09-27'},'page_view','compare_click');
 assert.deepEqual(series?.rate,[0.25,null]);
 const href=trackingPageHref(period,'mobile',trackingPageScope('pdp','/products/ropot'));
 assert.ok(href.includes('page=pdp'));assert.ok(href.includes('device=mobile'));assert.ok(href.includes('path=%2Fproducts%2Fropot'));
});

test('complete page tables retain all 27 definitions including zero activity and append unknown received events',()=>{
 const names=pageEventNames(report([{dimensions:['undefined'],metrics:[2,1]}]));
 assert.equal(names.length,28);assert.equal(new Set(names).size,28);
 for(const item of trackingEventDefinitions)assert.ok(names.includes(item.event));
});
