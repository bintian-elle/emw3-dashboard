import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyRows} from './edm-live-daily.ts';

test('empty Klaviyo grouped placeholder is not a malformed daily report',()=>{
 const dates=['2026-10-20','2026-10-21','2026-10-22'];
 const page={data:{attributes:{dates,data:[{dimensions:[''],measurements:{count:[0]}}]}}};
 assert.deepEqual(dailyRows([page],['count']),[]);
});

test('a truncated nonzero report cannot be mistaken for an empty placeholder',()=>{
 const dates=['2026-10-20','2026-10-21'];
 const page={data:{attributes:{dates,data:[{dimensions:[''],measurements:{count:[1]}}]}}};
 assert.throws(()=>dailyRows([page],['count']),/Invalid Klaviyo daily measurement/);
});

test('zero placeholder is accepted only when every requested measurement is present and zero',()=>{
 const dates=['2026-10-20','2026-10-21'];
 const page={data:{attributes:{dates,data:[{dimensions:[''],measurements:{count:[0]}}]}}};
 assert.throws(()=>dailyRows([page],['count','sum_value']),/Invalid Klaviyo daily measurement/);
});

test('complete daily rows retain their dates and metrics',()=>{
 const page={data:{attributes:{dates:['2026-10-20','2026-10-21'],data:[{dimensions:['A'],measurements:{count:[2,3]}}]}}};
 assert.deepEqual(dailyRows([page],['count']).map(x=>x.measurements.count),[2,3]);
});
