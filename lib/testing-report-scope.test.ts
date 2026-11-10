import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testingReportScope} from './testing-report-scope.ts';

test('monthly reports intersect each channel with its own test start',()=>{
 const scope=testingReportScope('reddit',{start:'2026-09-01',end:'2026-09-30'},{start:'2026-08-01',end:'2026-08-31'});
 assert.deepEqual(scope.current,{start:'2026-09-24',end:'2026-09-30'});
 assert.equal(scope.previous,null);
});
test('periods before test start are unavailable, rather than zero',()=>{
 const scope=testingReportScope('meta',{start:'2026-09-01',end:'2026-09-30'},{start:'2026-08-01',end:'2026-08-31'});
 assert.equal(scope.current,null);assert.equal(scope.previous,null);
});
test('period and comparison are clipped independently',()=>{
 const scope=testingReportScope('google-search',{start:'2026-10-13',end:'2026-10-19'},{start:'2026-10-06',end:'2026-10-12'});
 assert.deepEqual(scope.current,{start:'2026-10-13',end:'2026-10-19'});
 assert.deepEqual(scope.previous,{start:'2026-10-08',end:'2026-10-12'});
});
test('user-confirmed social start includes September 7',()=>{
 assert.deepEqual(testingReportScope('social-media',{start:'2026-09-01',end:'2026-09-30'},null).current,{start:'2026-09-07',end:'2026-09-30'});
});

test('social metadata excludes later and pre-test posts and never exposes lifetime metrics', async()=>{
 const {socialPostsForReport}=await import('./testing-report-scope.ts');
 const posts=[{code:'before',publishedAt:'2026-09-06T12:00:00Z',metrics:{views:100}}, {code:'inside',publishedAt:'2026-09-18T12:00:00Z',metrics:{views:200}}, {code:'later',publishedAt:'2026-10-01T12:00:00Z',metrics:{views:300}}];
 assert.deepEqual(socialPostsForReport(posts,{start:'2026-09-07',end:'2026-09-30'}),[{code:'inside',publishedAt:'2026-09-18T12:00:00Z'}]);
});

test('scopes current and prior periods to the individual campaign start',async()=>{
 const {testingCampaignReportScope}=await import('./testing-report-scope.ts');
 const period={start:'2026-11-03',end:'2026-11-10'}, previous={start:'2026-10-26',end:'2026-11-02'};
 assert.deepEqual(testingCampaignReportScope('meta','2026Nov9_EMW3_ContentTesing_Wave2_Prospecting_SalesConversion_VO',period,previous),{testStart:'2026-11-09',current:{start:'2026-11-09',end:'2026-11-10'},previous:null});
});
test('an unverified campaign date is unavailable and cannot fall back to a channel start',async()=>{
 const {testingCampaignReportScope}=await import('./testing-report-scope.ts');
 assert.deepEqual(testingCampaignReportScope('meta','new campaign',{start:'2026-11-01',end:'2026-11-10'},null),{testStart:null,current:null,previous:null});
});
test('Campaigns in the same channel may have different eligible periods',async()=>{
 const {testingCampaignReportScope}=await import('./testing-report-scope.ts');
 const day={start:'2026-10-19',end:'2026-10-19'};
 assert.deepEqual(testingCampaignReportScope('google-pmax','EM-PMAX-Conquesting-June26',day,null).current,day);
 assert.equal(testingCampaignReportScope('google-pmax','EM-PMAX-AllProduct-Mar25',day,null).current,null);
});
