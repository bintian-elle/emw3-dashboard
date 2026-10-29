import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testingShareHref} from './testing-share-link.ts';

test('share links freeze the applied dates while retaining the page and context',()=>{
 const url=new URL(testingShareHref('https://example.com/bluevua/testing/meta/group?designPreview=nova&period=last7&returnTo=%2Fbluevua%2Ftesting%2Fmeta%3Fperiod%3Dlast7#details',{start:'2026-10-20',end:'2026-10-26'}));
 assert.equal(url.pathname,'/bluevua/testing/meta/group');
 assert.equal(url.searchParams.get('period'),'custom');
 assert.equal(url.searchParams.get('start'),'2026-10-20');
 assert.equal(url.searchParams.get('end'),'2026-10-26');
 assert.equal(url.searchParams.get('shared'),'1');
 assert.equal(url.searchParams.get('designPreview'),'nova');
 assert.equal(url.searchParams.get('returnTo'),'/bluevua/testing/meta?period=last7');
 assert.equal(url.hash,'#details');
});

test('lifetime pages retain their original reporting semantics',()=>{
 const url=new URL(testingShareHref('https://example.com/bluevua/testing/social?designPreview=nova'));
 assert.equal(url.searchParams.get('period'),null);
 assert.equal(url.searchParams.get('shared'),'1');
});

test('Google Search shares the page period even when a concluded campaign has a shorter lifetime',()=>{
 const lifetime={start:'2026-10-23',end:'2026-10-25'};
 const reportingPeriod={start:'2026-10-20',end:'2026-10-26'};
 const url=new URL(testingShareHref('https://example.com/bluevua/testing/google/search?period=lastWeek',lifetime,reportingPeriod));
 assert.equal(url.searchParams.get('start'),'2026-10-20');
 assert.equal(url.searchParams.get('end'),'2026-10-26');
});
