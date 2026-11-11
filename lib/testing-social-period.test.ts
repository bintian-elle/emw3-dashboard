import {test} from 'node:test';
import assert from 'node:assert/strict';
import {socialSnapshotPeriod} from './testing-social-period.ts';

test('Social Lifetime ends on the actual snapshot date, not the current day or insight date',()=>{
 assert.deepEqual(socialSnapshotPeriod({capturedAt:'2026-11-11T16:47:00Z',posts:[{publishedAt:'2026-10-23T15:00:00Z'},{publishedAt:'2026-09-07T03:00:00Z'}]}),{start:'2026-09-07',end:'2026-11-11'});
});
test('missing dates remain unknown and future post dates cannot extend the snapshot',()=>{
 assert.equal(socialSnapshotPeriod({capturedAt:'',posts:[{publishedAt:'2026-09-07T00:00:00Z'}]}),null);
 assert.equal(socialSnapshotPeriod({capturedAt:'2026-11-11T00:00:00Z',posts:[{publishedAt:'2026-12-01T00:00:00Z'}]}),null);
});
