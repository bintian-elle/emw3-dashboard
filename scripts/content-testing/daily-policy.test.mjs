import test from 'node:test';
import assert from 'node:assert/strict';
import {dailyPresets} from './daily-policy.mjs';
test('weekly reports are reused after Tuesday; missing exact weeks catch up once',()=>{
 assert.deepEqual(dailyPresets(2,true),['lastWeek','wtd','mtd']);
 for(const day of [0,1,3,4,5,6])assert.deepEqual(dailyPresets(day,true),['wtd','mtd']);
 assert.deepEqual(dailyPresets(3,false),['lastWeek','wtd','mtd']);
});
