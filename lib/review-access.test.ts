import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canAccessReviewTools,canWriteReviewTools,reviewExpectedOrigin,reviewPreviewEnabled,reviewPreviewRequestAllowed} from './review-access.ts';

test('review tools are limited to the original three signed-in reviewers',()=>{
 for(const email of ['bintian.feng@elle-media.com','ivan.he@elle-media.com','fiona.deng@elle-media.com'])assert.equal(canAccessReviewTools({email}),true);
 assert.equal(canAccessReviewTools({email:'FIONA.DENG@ELLE-MEDIA.COM'}),true);
 for(const user of [null,{email:''},{email:'other@elle-media.com'},{email:'fiona.deng@elle-media.com.evil.test'}])assert.equal(canAccessReviewTools(user),false);
});
test('local production preview accepts only a loopback origin',()=>{
 assert.equal(reviewExpectedOrigin('http://localhost:3001/api/staging/notes','https://dashboard.example',true),'http://localhost:3001');
 assert.equal(reviewExpectedOrigin('https://evil.example/api/staging/notes','https://dashboard.example',true),'https://dashboard.example');
 assert.equal(reviewExpectedOrigin('http://localhost:3001/api/staging/notes','https://dashboard.example',false),'https://dashboard.example');
});
test('review tool writes require both reviewer identity and same origin',()=>{
 const user={email:'bintian.feng@elle-media.com'};
 assert.equal(canWriteReviewTools(user,'https://dashboard.example','https://dashboard.example'),true);
 assert.equal(canWriteReviewTools(user,'https://evil.example','https://dashboard.example'),false);
 assert.equal(canWriteReviewTools({email:'other@elle-media.com'},'https://dashboard.example','https://dashboard.example'),false);
 assert.equal(canWriteReviewTools(user,null,'https://dashboard.example'),false);
});
test('preview mode never grants an unlisted user access',()=>{
 assert.equal(reviewPreviewEnabled({email:'bintian.feng@elle-media.com'},'1'),true);
 assert.equal(reviewPreviewEnabled({email:'bintian.feng@elle-media.com'},undefined),false);
 assert.equal(reviewPreviewEnabled({email:'other@elle-media.com'},'1'),false);
 assert.equal(reviewPreviewEnabled(null,'1'),false);
});
test('preview mode blocks report publication and source refresh while retaining notes and prompt trials',()=>{
 for(const path of ['/api/testing/data-refresh','/api/testing/social-refresh','/api/testing/readouts/refresh','/api/testing/history/generate'])assert.equal(reviewPreviewRequestAllowed('POST',path),false);
 assert.equal(reviewPreviewRequestAllowed('GET','/api/klaviyo/insights/refresh'),false);
 assert.equal(reviewPreviewRequestAllowed('GET','/api/testing/data-refresh'),true);
 for(const path of ['/api/review/notes','/api/testing/prompts','/api/review/preview'])assert.equal(reviewPreviewRequestAllowed('POST',path),true);
});
