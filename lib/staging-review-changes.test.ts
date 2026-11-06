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

test('bilingual insight review links target analysis, separately from business metrics',()=>{
 const analysis=reviewChangeFromHash('#review-change=testing-integrated-insights')!;
 const metrics=reviewChangeFromHash('#review-change=testing-layout')!;
 assert.equal(analysis.target,'testing-analysis');assert.notEqual(analysis.target,metrics.target);assert.equal(analysis.reveal,'analysis');
});

test('history report change is reviewable without dropping existing release entries',()=>{
 const changes=reviewChanges(['testing-period-comparison','testing-integrated-insights','testing-prompts','testing-report-history']);
 assert.deepEqual(changes.map(change=>change.id),['testing-period-comparison','testing-integrated-insights','testing-prompts','testing-report-history']);
 const history=changes[3];assert.equal(history.page,'/bluevua/testing');assert.equal(history.target,'testing-report-history');
 assert.ok(history.title.zh&&history.title.en&&history.description.zh&&history.description.en);
});
