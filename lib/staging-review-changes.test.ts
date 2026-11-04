import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewChanges,reviewChangeHref,reviewChangeFromHash} from './staging-review-changes.ts';
test('release links accept only known IDs and local canonical destinations',()=>{
 const changes=reviewChanges(['social-post-order','evil','social-post-order','creative-previews']);
 assert.deepEqual(changes.map(change=>change.id),['social-post-order','creative-previews']);
 assert.equal(reviewChangeHref(changes[0]),'/bluevua/testing/social#review-change=social-post-order');
 assert.equal(reviewChangeFromHash('#review-change=social-post-order')?.id,'social-post-order');
 assert.equal(reviewChangeFromHash('#review-change=https://evil.example'),undefined);
 assert.deepEqual(reviewChanges(null),[]);
});
