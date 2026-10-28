import {test} from 'node:test';
import assert from 'node:assert/strict';
import {overviewHeadlineMetrics,formatOverviewHeadlineMetrics,type OverviewHeadlineInput} from './overview-headline-metrics.ts';

const row={spend:100,revenue:200,orders:2,impressions:1000,clicks:10};
function input():OverviewHeadlineInput{return {
 google:[{groups:[{...row,spend:50,revenue:100,orders:.5,impressions:null}],reach:null}],
 meta:{totals:{...row,reach:21137}},
 reddit:{campaigns:[{reach:61525,groups:[{activeAds:[{...row,spend:25,revenue:50,orders:.25}]}]}]},
 edm:{tests:[{revenue:60,orders:1,delivered:0,clicks:2}],uniqueRecipients:0},
};}

test('live headline uses the same configured financial/reach scope as Overview cards',()=>{
 const data=input(),before=structuredClone(data),metrics=overviewHeadlineMetrics(data);
 assert.equal(metrics.totalReach,82662);
 assert.equal(metrics.spend,175);
 assert.equal(metrics.revenue,410);
 assert.equal(metrics.orders,3.75);
 assert.equal(metrics.roas,2);
 assert.equal(metrics.ctr,null);
 assert.deepEqual(data,before);
});
test('headline formats match existing cards, including fractional purchases and missing CTR',()=>{
 assert.deepEqual(formatOverviewHeadlineMetrics(overviewHeadlineMetrics(input())),{
  spend:'$175.00',revenue:'$410',orders:'4',totalReach:'82,662',roas:'2.00',ctr:'—',
 });
});
test('EDM contributes revenue, purchases, Delivered, but not advertising CTR or paid ROAS',()=>{
 const data=input();data.google=[];data.meta.totals={...row,reach:100};data.reddit.campaigns=[];
 data.edm={tests:[{revenue:60,orders:1,delivered:4000,clicks:20}],uniqueRecipients:3000};
 const result=overviewHeadlineMetrics(data);
 assert.equal(result.totalReach,4100);assert.equal(result.ctr,10/1000);
 assert.equal(result.roas,2);assert.equal(result.revenue,260);assert.equal(result.orders,3);
});
test('unknown email clicks do not suppress advertising CTR; zero paid spend has no ROAS',()=>{
 const data=input();data.google=[];data.reddit.campaigns=[];
 data.meta.totals={...row,spend:0,reach:null};data.edm.tests[0].clicks=null;
 const result=overviewHeadlineMetrics(data);
 assert.equal(result.roas,null);assert.equal(result.ctr,.01);
 assert.equal(formatOverviewHeadlineMetrics(result).roas,'—');
});

test('advertising CTR excludes both clicks and impressions from explicitly identified PMax only',()=>{
 const data=input();data.google=[{channel:'pmax',groups:[{...row,clicks:999,impressions:null}]},{channel:'demand-gen',groups:[{...row,clicks:5,impressions:500}]},{groups:[{...row,clicks:20,impressions:2000}]}];
 data.edm.tests=[{revenue:60,orders:1,delivered:10000,clicks:1000}];
 const result=overviewHeadlineMetrics(data);
 assert.equal(result.ctr,45/4500);
 assert.equal(result.revenue,910);
});
test('missing non-PMax impressions still suppress advertising CTR',()=>{
 const data=input();data.google=[{channel:'demand-gen',groups:[{...row,impressions:null}]}];
 assert.equal(overviewHeadlineMetrics(data).ctr,null);
});
