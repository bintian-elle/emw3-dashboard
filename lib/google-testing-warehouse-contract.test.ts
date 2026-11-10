import test from 'node:test';import assert from 'node:assert/strict';
import {warehouseCoverage,uncoveredWindows} from './google-testing-warehouse-contract.ts';
const now=Date.parse('2026-10-28T18:00:00Z');
const run=(start:string,end:string,completed='2026-10-28T11:55:00Z')=>({query_text:`WHERE segments.date BETWEEN '${start}' AND '${end}'`,completed_at:completed});
test('successful zero-row extraction still covers its dates; gaps require API',()=>{
 const covered=warehouseCoverage([run('2026-10-21','2026-10-28')],'2026-10-13','2026-10-28',now);
 assert.deepEqual(uncoveredWindows(covered,'2026-10-13','2026-10-28'),[{start:'2026-10-13',end:'2026-10-20'},{start:'2026-10-28',end:'2026-10-28'}]);
});
test('merges overlapping historical backfill and daily runs without double counting',()=>{
 const covered=warehouseCoverage([run('2025-01-01','2026-10-21','2026-10-21T12:00:00Z'),run('2026-10-21','2026-10-28')],'2026-10-13','2026-10-27',now);
 assert.deepEqual(uncoveredWindows(covered,'2026-10-13','2026-10-27'),[]);
});
test('stale sync cannot cover recent attribution or imply zeros from an unknown date filter',()=>{
 assert.deepEqual(warehouseCoverage([run('2026-10-21','2026-10-27','2026-10-26T00:00:00Z')],'2026-10-21','2026-10-27',now),[]);
 assert.deepEqual(warehouseCoverage([{query_text:'SELECT * FROM ad_group_ad',completed_at:new Date(now)}],'2026-10-21','2026-10-27',now),[]);
});
test('yesterday’s extraction of a then-current partial day never proves that whole day is covered',()=>{
 const covered=warehouseCoverage([run('2026-10-20','2026-10-27','2026-10-27T11:55:00Z')],'2026-10-26','2026-10-27',now);
 assert.deepEqual(uncoveredWindows(covered,'2026-10-26','2026-10-27'),[{start:'2026-10-27',end:'2026-10-27'}]);
});

test('scheduled refresh uses the API for recent dates when only yesterday’s sync succeeded',()=>{
 const refresh=Date.parse('2026-11-10T10:15:00Z');
 const runs=[run('2026-11-01','2026-11-09','2026-11-09T09:32:18Z')];
 const start='2026-11-01',end='2026-11-09';
 const covered=warehouseCoverage(runs,start,end,refresh,{requireToday:true});
 assert.deepEqual(uncoveredWindows(covered,start,end),[{start:'2026-11-03',end}]);
 assert.deepEqual(uncoveredWindows(warehouseCoverage(runs,start,end,refresh),start,end),[{start:end,end}]);
});
