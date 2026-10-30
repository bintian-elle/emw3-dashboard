import test from 'node:test';
import assert from 'node:assert/strict';
import {metaTestingAdInventory} from './meta-testing-ad-scope.ts';
import {isMetaVideo} from './meta-creative-type.ts';
test('paused testing ads remain available for selected-period performance and creative classification',()=>{
 const ads=[{id:'image',name:'Image1',adset_id:'group',configured_status:'PAUSED',effective_status:'PAUSED'}, {id:'video',name:'Video4_demo',adset_id:'group',configured_status:'PAUSED',effective_status:'PAUSED',creative:{video_id:'v1'}}];
 const result=metaTestingAdInventory(ads,[{ad_id:'video',ad_name:'Video4_demo',adset_id:'group',spend:'13.17'}]);
 assert.deepEqual(result.map(ad=>ad.id),['image','video']);
 assert.equal(result[1].configured_status,'PAUSED');
 assert.equal(isMetaVideo(result[1].name,result[1].creative),true);
});
test('historical ad insights survive missing inventory and duplicates without replacing rich creative metadata',()=>{
 const ad={id:'v1',name:'Video1',adset_id:'g',configured_status:'ACTIVE',creative:{video_id:'youtube'}};
 const result=metaTestingAdInventory([ad,ad],[{ad_id:'v1',ad_name:'Old name',adset_id:'g'},{ad_id:'deleted',ad_name:'Video2_Historical',adset_id:'g'},{adset_id:'g'}]);
 assert.equal(result.length,2);assert.equal(result[0].name,'Video1');assert.equal(result[0].creative?.video_id,'youtube');
 assert.equal(result[1].id,'deleted');assert.equal(result[1].name,'Video2_Historical');
 assert.equal(result[1].effective_status,'UNKNOWN');
});
