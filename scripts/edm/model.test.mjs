import test from 'node:test';import assert from 'node:assert/strict';
import {days,timeframe,aggregateRows,flowRows,campaignRows,replaceSlice,mergeCoverage} from './model.mjs';
test('Eastern full-day windows respect DST and reject inverted dates',()=>{
 assert.deepEqual(days('2026-11-10','2026-11-12'),['2026-11-10','2026-11-11']);assert.throws(()=>days('2026-02-30','2026-03-02'));
 const r=timeframe('2026-03-08','2026-03-09');assert.equal((Date.parse(r.end)-Date.parse(r.start))/3600000,23);
});
test('completed coverage cannot bridge an uncollected gap',()=>{
 assert.throws(()=>mergeCoverage({start:'2026-11-10',end:'2026-11-10'},{start:'2026-11-17',end:'2026-11-18'}),/gap/);
 assert.deepEqual(mergeCoverage({start:'2026-11-10',end:'2026-11-17'},{start:'2026-11-17',end:'2026-11-18'}),{start:'2026-11-10',end:'2026-11-18'});
});
test('daily aggregates preserve supplied zeroes, reject missing measurements and duplicate day groups',()=>{
 const page={data:{attributes:{dates:['2026-11-10T00:00:00-05:00'],data:[{dimensions:[],measurements:{count:[0],unique:[0]}}]}}};
 assert.deepEqual(aggregateRows([page],['count','unique']),[{date:'2026-11-10',dimensions:[],count:0,unique:0}]);
 assert.throws(()=>aggregateRows([page],['sum_value']),/measurement/);assert.throws(()=>aggregateRows([page,page],['count']),/Duplicate/);
});
test('flow series uses platform daily attribution and keeps fractional orders',()=>{
 const p={data:{attributes:{results:[{groupings:{flow_id:'f',flow_message_id:'m',send_channel:'email'},statistics:{conversions:0.918,conversion_value:12}}]}}};
 const r=flowRows([p],['conversions','conversion_value'],'2026-11-10');assert.equal(r[0].conversions,0.918);assert.equal(r[0].date,'2026-11-10');
 assert.throws(()=>flowRows([p],['recipients'],'2026-11-10'),/measurement/);
});
test('campaign attribution requires actual send metadata and does not substitute report-end date',()=>{
 const p={data:{attributes:{results:[{groupings:{campaign_id:'c',campaign_message_id:'m',send_channel:'email'},statistics:{delivered:5}}]}}};
 assert.throws(()=>campaignRows([p],new Map(),['delivered']),/send date/);
 const r=campaignRows([p],new Map([['c',{send_time:'2026-11-10T16:00:00Z'}]]),['delivered']);assert.equal(r[0].send_date,'2026-11-10');
});
test('failed atomic slice replacement rolls back instead of exposing partial writes',async()=>{
 const calls=[];const db={query:async(sql)=>{calls.push(sql);if(sql.startsWith('INSERT'))throw Error('simulated write failure');return{rows:[]};}};
 await assert.rejects(()=>replaceSlice(db,'fact_metric_daily','date','2026-11-10','2026-11-11',[{date:'2026-11-10'}]));assert.equal(calls.at(-1),'ROLLBACK');assert.ok(!calls.includes('COMMIT'));
});
