import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildChannelPerformance,channelPerformanceHref,socialChannelPerformance} from './channel-performance-data.ts';

const row=(spend:number,revenue:number,orders:number,clicks:number,impressions:number|null)=>({spend,revenue,orders,clicks,impressions});
const report=(campaignName:string,rows:ReturnType<typeof row>[])=>({campaignName,groups:rows});
const base={search:[report('Search',[row(10,40,2,5,100),row(30,20,1,15,300)])],pmax:[report('PMax',[row(10,20,1,3,100)])],demandGen:[],meta:{campaigns:[{campaignName:'Meta test'}],totals:{...row(20,40,2,10,100),reach:70}},reddit:{campaigns:[{name:'Reddit test',reach:50,groups:[{activeAds:[row(10,5,0,2,100)]}]}]},edm:{campaigns:[{campaignName:'Email test'}],tests:[{hasData:true,revenue:5,orders:1,delivered:100,clicks:5},{hasData:true,revenue:4,orders:2,delivered:300,clicks:9}]},query:''};
test('paid totals use the same test rows and weighted rates, and PMAX CTR is unavailable',()=>{
 const rows=buildChannelPerformance(base);const search=rows[0],pmax=rows[1];
 assert.deepEqual([search.spend,search.revenue,search.orders,search.ctr,search.roas],[40,60,3,0.05,1.5]);
 assert.equal(search.reach,null);assert.equal(pmax.ctr,null);
 assert.equal(rows[2].spend,null);
});
test('email uses delivered as its denominator and never invents ad spend or ROAS',()=>{
 const email=buildChannelPerformance(base)[5];assert.equal(email.reach,400);assert.equal(email.ctr,14/400);assert.equal(email.spend,null);assert.equal(email.roas,null);
 const missing=buildChannelPerformance({...base,edm:{...base.edm,tests:[{...base.edm.tests[0],clicks:null}]}})[5];assert.equal(missing.ctr,null);
});
test('links keep the actual selected period and never fall back to Reddit lifetime',()=>{
 assert.equal(channelPerformanceHref('reddit',''),'/bluevua/testing/reddit?period=lastWeek');
 assert.equal(channelPerformanceHref('meta','period=custom&start=2026-09-01&end=2026-09-30'),'/bluevua/testing/meta?period=custom&start=2026-09-01&end=2026-09-30');
 assert.equal(buildChannelPerformance(base)[0].anchors[0],'campaign:google-search:Search');
});
test('organic social totals require every selected post and never turn missing data into zero',()=>{
 const complete=socialChannelPerformance([{metrics:{views:7,reach:4}},{metrics:{views:9,reach:5}}],false);assert.equal(complete.views,16);assert.equal(complete.reach,9);
 const incomplete=socialChannelPerformance([{metrics:{views:7,reach:4}},{metrics:{views:null,reach:null}}],true);assert.equal(incomplete.views,null);assert.equal(incomplete.reach,null);assert.equal(incomplete.stale,true);
});
