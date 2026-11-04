import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stagingReviewHref,stagingStartHref,safeStagingPage} from './staging-navigation.ts';
test('staging review preserves the current page and filters through the initial login handoff',()=>{
 const page='/bluevua/testing/social',search='period=custom&start=2026-10-27&end=2026-11-02';
 const entry=new URL(stagingReviewHref(page,search),'https://emw3-dashboard.win');
 assert.equal(entry.searchParams.get('returnTo'),page+'?'+search);
 const start=new URL(stagingStartHref(entry.searchParams.get('returnTo')));
 assert.equal(start.origin,'https://staging.emw3-dashboard.win');assert.equal(start.pathname,'/api/auth/staging/start');assert.equal(start.searchParams.get('returnTo'),page+'?'+search);
 assert.equal(safeStagingPage('//evil.example'),'/');assert.equal(safeStagingPage('/api/auth/logout'),'/');
});
