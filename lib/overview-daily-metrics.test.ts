import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOverviewDailyMetrics, type OverviewDailySource } from './overview-daily-metrics.ts';

const period={start:'2026-10-20',end:'2026-10-22'};
const row={date:period.start,entityId:'a',assetType:'Message' as const,spend:10,revenue:30,orders:2,clicks:10,impressions:100};
test('fills the date axis and computes daily rates from daily inputs, without averaging ratios',()=>{
 const sources:OverviewDailySource[]=[{channel:'Google',rows:[row,{...row,entityId:'b',spend:30,revenue:30,orders:3,clicks:30,impressions:300}]}];
 const result=buildOverviewDailyMetrics(period,sources);
 assert.equal(result.revenue.length,3);
 assert.equal(result.revenue[0].Google,60);
 assert.equal(result.roas[0].Google,1.5);
 assert.equal(result.ctr[0].Google,.1);
 assert.ok(Math.abs(result.cvr[0].Google!-.15)<1e-10);
 assert.equal(result.revenue[1].Google,0);
 assert.equal(result.roas[1].Google,null);
 assert.equal(result.revenue[0].Meta,null);
});
test('preserves unavailable impressions and daily reach; never adds reach across days',()=>{
 const result=buildOverviewDailyMetrics(period,[{channel:'Meta',rows:[{...row,impressions:null}],reach:[{date:period.start,value:42},{date:period.end,value:35}]}]);
 assert.equal(result.ctr[0].Meta,null);
 assert.equal(result.reach[0].Meta,42);
 assert.equal(result.uniqueReach[2].Meta,35);
 assert.equal(result.uniqueReach[1].Meta,0);
 assert.equal(result.uniqueReach[0].Google,null);
});
test('counts distinct assets with delivery and preserves missing sources as gaps',()=>{
 const result=buildOverviewDailyMetrics(period,[{channel:'Google',rows:[row,row,{...row,entityId:'b',spend:0,impressions:0,clicks:0}]}]);
 assert.equal(result.assets[0].Message,1);
 assert.equal(result.assets[1].Message,0);
 assert.equal(result.assets[0].Video,null);
});
test('EDM uses delivered for CTR, unique recipients for unique reach, and has no paid ROAS',()=>{
 const result=buildOverviewDailyMetrics(period,[{channel:'EDM',rows:[{...row,spend:0,delivered:200}],reach:[{date:period.start,value:180}]}]);
 assert.equal(result.ctr[0].EDM,.05);
 assert.equal(result.reach[0].EDM,200);
 assert.equal(result.uniqueReach[0].EDM,180);
 assert.equal(result.roas[0].EDM,null);
});
test('keeps campaign financial scope separate from active ad CVR and inventory',()=>{
 const result=buildOverviewDailyMetrics(period,[{channel:'Meta',rows:[row],totals:[{...row,revenue:500,spend:100,orders:10,clicks:50,impressions:1000}]}]);
 assert.equal(result.revenue[0].Meta,500);
 assert.equal(result.roas[0].Meta,5);
 assert.equal(result.ctr[0].Meta,.05);
 assert.equal(result.cvr[0].Meta,.2);
 assert.equal(result.assets[0].Message,1);
});
test('preserves explicit missing reach and adds available campaign reach within a day',()=>{
 const result=buildOverviewDailyMetrics(period,[{channel:'Reddit',rows:[],reach:[{date:period.start,value:10},{date:period.start,value:20},{date:period.end,value:null}]}]);
 assert.equal(result.reach[0].Reddit,30);
 assert.equal(result.reach[2].Reddit,null);
});
test('groups Google ad rows before averaging daily conversion rates, matching headline entity basis',()=>{
 const result=buildOverviewDailyMetrics(period,[{channel:'Google',rows:[{...row,cvrEntityId:'group'},{...row,entityId:'b',cvrEntityId:'group',clicks:30,orders:3},{...row,entityId:'c',cvrEntityId:'other',clicks:10,orders:0}]}]);
 assert.equal(result.cvr[0].Google,.0625);
 assert.equal(result.assets[0].Message,3);
});

test('Google daily CTR excludes PMax without excluding it from revenue or ROAS',()=>{
 const result=buildOverviewDailyMetrics(period,[{channel:'Google',rows:[row,{...row,entityId:'pmax',excludeFromAdCtr:true,clicks:50,impressions:null,revenue:100}]}]);
 assert.equal(result.ctr[0].Google,.1);
 assert.equal(result.revenue[0].Google,130);
 assert.equal(result.roas[0].Google,6.5);
});
