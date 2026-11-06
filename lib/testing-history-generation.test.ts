import {test} from 'node:test';
import assert from 'node:assert/strict';
import {historyGenerationRequest} from './testing-history-generation.ts';

test('validates weekly, daily and calendar-month comparisons',()=>{
 assert.deepEqual(historyGenerationRequest({scope:'google-search',frequency:'weekly',start:'2026-10-27',end:'2026-11-02'},'2026-11-05'),{scope:'google-search',kind:'weekly',start:'2026-10-27',end:'2026-11-02',compareStart:'2026-10-20',compareEnd:'2026-10-26'});
 assert.deepEqual(historyGenerationRequest({scope:'meta',frequency:'monthly',start:'2026-10-01',end:'2026-10-31'},'2026-11-05'),{scope:'meta',kind:'monthly',start:'2026-10-01',end:'2026-10-31',compareStart:'2026-09-01',compareEnd:'2026-09-30'});
 assert.deepEqual(historyGenerationRequest({scope:'social-media',frequency:'daily',start:'2026-10-01',end:'2026-10-01'},'2026-11-05'),{scope:'social-media',kind:'daily',start:'2026-10-01',end:'2026-10-01',compareStart:'2026-09-30',compareEnd:'2026-09-30'});
});
test('rejects invalid dates, incomplete periods, future dates and unknown scopes',()=>{
 for(const value of [{scope:'meta',frequency:'daily',start:'2026-02-30',end:'2026-02-30'},{scope:'meta',frequency:'weekly',start:'2026-10-26',end:'2026-11-01'},{scope:'meta',frequency:'monthly',start:'2026-10-01',end:'2026-10-30'},{scope:'meta',frequency:'daily',start:'2026-11-06',end:'2026-11-06'},{scope:'bad',frequency:'daily',start:'2026-10-01',end:'2026-10-01'}])assert.throws(()=>historyGenerationRequest(value,'2026-11-05'));
});
test('manual custom periods compare against a preceding equal-length interval',()=>{assert.deepEqual(historyGenerationRequest({scope:'meta',frequency:'custom',start:'2026-10-20',end:'2026-10-22'},'2026-11-05'),{scope:'meta',kind:'custom',start:'2026-10-20',end:'2026-10-22',compareStart:'2026-10-17',compareEnd:'2026-10-19'});});
test('recognizes saved weekly periods and honors an explicit comparison',()=>{assert.deepEqual(historyGenerationRequest({scope:'meta',frequency:'auto',start:'2026-10-27',end:'2026-11-02',compareStart:'2026-10-13',compareEnd:'2026-10-19'},'2026-11-05'),{scope:'meta',kind:'weekly',start:'2026-10-27',end:'2026-11-02',compareStart:'2026-10-13',compareEnd:'2026-10-19'});});
