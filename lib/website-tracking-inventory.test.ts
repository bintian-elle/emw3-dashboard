import test from 'node:test';
import assert from 'node:assert/strict';
import {featureInventory,featureDefinitions,inventoryMeasurement} from './website-tracking-inventory.ts';
import type {FeatureTrackingReports} from './website-tracking-inventory.ts';
const report=(rows:Array<{dimensions:string[];metrics:number[]}>=[])=>({rows,warnings:[]});
function reports():FeatureTrackingReports{return {events:report(),operations:report(),items:report(),coupons:report(),entryPoints:report(),collectionEntries:report(),pdpVisitors:report()};}
test('inventory covers all 50 distinct checks, 37 nodes, 11 event names and five functions',()=>{
 assert.equal(featureInventory.length,50);assert.equal(new Set(featureInventory.map(row=>row.id)).size,50);
 assert.equal(new Set(featureInventory.map(row=>row.node)).size,37);
 assert.equal(new Set(featureInventory.map(row=>row.event)).size,11);
 assert.deepEqual(featureDefinitions.map(feature=>featureInventory.filter(row=>row.feature===feature.id).length),[9,9,9,12,11]);
 assert.deepEqual(['collection','compare','pdp','cart'].map(page=>featureInventory.filter(row=>row.page===page).length),[2,10,9,29]);
});
test('success/error/unverified and promo apply/remove stay distinct without summing users',()=>{
 const data=reports();data.operations=report([
 {dimensions:['cart_feature_result','cart_recommendations','add','success'],metrics:[7,4]},
 {dimensions:['cart_feature_result','cart_recommendations','add','unverified'],metrics:[2,2]},
 {dimensions:['cart_feature_result','promo_code','remove','success'],metrics:[3,2]},
 {dimensions:['cart_feature_result','promo_code','apply','success'],metrics:[8,5]},
 ]);
 const get=(id:string)=>inventoryMeasurement(featureInventory.find(row=>row.id===id)!,data);
 assert.equal(get('cart_recommendations-success').events,7);assert.equal(get('cart_recommendations-success').users,4);
 assert.equal(get('promo_code-apply-success').events,8);assert.equal(get('promo_code-remove-success').events,3);
});
test('known complete empty reports mean no recorded activity; missing/error/partial reports never become zero',()=>{
 const item=featureInventory.find(row=>row.id==='pdp_addons-submit')!;
 assert.equal(inventoryMeasurement(item,reports()).status,'empty');
 assert.equal(inventoryMeasurement(item,undefined).events,null);
 const data=reports();data.operations.error='failed';assert.equal(inventoryMeasurement(item,data).status,'unavailable');
 data.operations=report();data.operations.warnings=['Partial GA4 report.'];assert.equal(inventoryMeasurement(item,data).events,null);
});
test('item-list quantities and attributed revenue are exact by source and do not become user counts',()=>{
 const data=reports();data.items=report([{dimensions:['pdp_addons'],metrics:[100,12,5,3,2,49.5]},{dimensions:['cart_recommendations'],metrics:[30,2,1,0,0,0]}]);
 const item=featureInventory.find(row=>row.id==='pdp_addons-purchase')!;
 assert.deepEqual(inventoryMeasurement(item,data),{events:null,users:null,quantity:2,revenue:49.5,status:'recorded'});
});
test('coupon order context excludes unset codes and never sums overlapping users across coupon rows',()=>{
 const data=reports();data.coupons=report([{dimensions:['SAVE10'],metrics:[2,2,50]},{dimensions:['SAVE20'],metrics:[3,2,75]},{dimensions:['(not set)'],metrics:[20,10,600]}]);
 const item=featureInventory.find(row=>row.id==='promo_code-purchase')!;
 const value=inventoryMeasurement(item,data);assert.equal(value.events,5);assert.equal(value.revenue,125);assert.equal(value.users,null);
});
