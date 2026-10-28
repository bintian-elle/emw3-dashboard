import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveOverviewExecutiveSummary,overviewAnalysisWithoutTotals} from './testing-readout-live-overview.ts';
const metrics={spend:1598.91783,revenue:4402.35944152,orders:16.122875,totalReach:82662,roas:2.753336887562259,ctr:null};
const analysis='Meta contributed the most revenue, $2,911.36 at 3.36 ROAS. PMax recorded 6.98 ROAS, but its $340.50 revenue came from one purchase. Retain Meta’s purchase-producing creatives.';
const lead='October 20–26 recorded $1,598.92 spend, 78,306 Total Reach, $4,402.36 attributed revenue, 2.75 paid ROAS and 16.122875 attributed purchases. Overall CTR is unavailable. ';

test('replace the aggregate lead, retaining exact cached channel/creative analysis',()=>{
 const result=liveOverviewExecutiveSummary(lead+analysis,metrics,'en');
 assert.ok(result.startsWith('Spend: $1,598.92'));
 assert.ok(result.includes('Total Reach: 82,662'));
 assert.ok(result.includes('Revenue: $4,402'));
 assert.ok(result.includes('Purchases: 16'));
 assert.ok(result.includes('CTR: —'));
 assert.ok(!result.includes('78,306'));
 assert.ok(result.endsWith(analysis));
});
test('Chinese live totals use the same values and preserve translated analysis exactly',()=>{
 const body='Meta 贡献了最多的收入，为 $2,911.36，ROAS 为 3.36。建议保留产生购买的素材。';
 const summary='10月20日至26日共花费 $1,598.92，总触达 78,306，收入 $4,402.36，付费 ROAS 为 2.75，产生 16.122875 笔购买。整体 CTR 暂不可用。'+body;
 const result=liveOverviewExecutiveSummary(summary,metrics,'zh');
 assert.ok(result.startsWith('花费：$1,598.92'));
 assert.ok(result.includes('总触达：82,662'));assert.ok(result.includes('购买数：16'));
 assert.ok(!result.includes('78,306'));assert.ok(result.endsWith(body));
});
test('channel evidence, named creative numbers, URLs and date comparisons are never globally replaced',()=>{
 const text='Meta Video4 · Worth It generated 2 purchases at 2.04 ROAS. Reach was 78,306 in the previous period. [Video4](https://example.com/video4)';
 assert.equal(overviewAnalysisWithoutTotals(text),text);
 assert.ok(liveOverviewExecutiveSummary(text,metrics,'en').endsWith(text));
});
test('preserve an insight after the semicolon of a mixed opening sentence',()=>{
 const text='The paid tests spent $100 at 2.00 ROAS; Meta Video4 deserves controlled validation.';
 assert.equal(overviewAnalysisWithoutTotals(text),'Meta Video4 deserves controlled validation.');
});
test('handle older short metric leads, decimals, Chinese punctuation and missing saved analysis',()=>{
 assert.equal(overviewAnalysisWithoutTotals('Spend $100; total reach 78,306. Continue testing.'),'Continue testing.');
 assert.equal(overviewAnalysisWithoutTotals('花费 $100，收入 $200，ROAS 为 2.00。继续验证。'),'继续验证。');
 assert.equal(overviewAnalysisWithoutTotals('No causal winner is established.'),'No causal winner is established.');
 const result=liveOverviewExecutiveSummary(undefined,{...metrics,spend:0,revenue:0,orders:0,totalReach:0,roas:null},'en');
 assert.ok(result.includes('Total Reach: 0'));assert.ok(result.includes('Paid ROAS: —'));
 assert.ok(!result.includes('undefined'));
});

test('qualitative overall interpretation and historical comparisons remain AI-authored',()=>{
 for(const text of ['Overall ROAS remains uncertain; repeat purchases are needed.','Total Reach rose from 70,000 in the previous period to 78,306.','整体 ROAS 仍有不确定性，需要继续验证。'])assert.equal(overviewAnalysisWithoutTotals(text),text);
});
