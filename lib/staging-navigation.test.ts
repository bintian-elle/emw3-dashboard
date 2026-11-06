import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stagingReviewHref,stagingStartHref,safeStagingPage} from './staging-navigation.ts';
test('staging review preserves the current page and filters through the initial login handoff',()=>{
 const page='/bluevua/testing/social',search='period=custom&start=2026-10-27&end=2026-11-02';
 const entry=new URL(stagingReviewHref(page,search),'https://emw3-dashboard.win');
 assert.equal(entry.searchParams.get('returnTo'),page+'?'+search+'&shared=1');
 const start=new URL(stagingStartHref(entry.searchParams.get('returnTo')));
 assert.equal(start.origin,'https://staging.emw3-dashboard.win');assert.equal(start.pathname,'/api/auth/staging/start');assert.equal(start.searchParams.get('returnTo'),page+'?'+search+'&shared=1');
 assert.equal(safeStagingPage('//evil.example'),'/');assert.equal(safeStagingPage('/api/auth/logout'),'/');
});
test('exit staging returns to the production counterpart with filters and location',async()=>{
 const {productionPageHref}=await import('./staging-navigation.ts');
 assert.equal(productionPageHref('/bluevua/testing/social','?period=lastWeek','#post-2'),'https://emw3-dashboard.win/bluevua/testing/social?period=lastWeek&shared=1#post-2');
 assert.equal(productionPageHref('//evil.example'),'https://emw3-dashboard.win/');
});

test('local staging returns to the local production preview without changing online staging',async()=>{
 const {productionPageHref}=await import('./staging-navigation.ts');
 const path='/bluevua/testing/google/pmax',search='period=lastWeek',hash='#campaign';
 assert.equal(productionPageHref(path,search,hash,'http://localhost:3000'),`http://localhost:3001${path}?period=lastWeek&shared=1${hash}`);
 assert.equal(productionPageHref(path,search,hash,'http://127.0.0.1:3000'),`http://127.0.0.1:3001${path}?period=lastWeek&shared=1${hash}`);
 assert.equal(productionPageHref(path,search,hash,'https://staging.emw3-dashboard.win'),`https://emw3-dashboard.win${path}?period=lastWeek&shared=1${hash}`);
});

test('cross-environment report navigation bypasses the ordinary refresh period reset',async()=>{
 const {testingDocumentPeriodRedirect}=await import('./testing-navigation.ts');const {productionPageHref}=await import('./staging-navigation.ts');
 const url=new URL(productionPageHref('/bluevua/testing','period=custom&start=2026-10-27&end=2026-11-02'));
 assert.equal(testingDocumentPeriodRedirect(url.pathname+url.search,'GET',new Headers({'sec-fetch-mode':'navigate','sec-fetch-dest':'document'})),null);
});
