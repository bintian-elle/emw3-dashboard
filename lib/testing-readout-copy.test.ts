import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanTestingReadoutCopy} from './testing-readout-copy.ts';
test('remove internal checklist markers after validation while keeping names and framework transport',()=>{
 const source={summary:'OV-DECISIONS: Keep Video4 — Actual Ad Name.',evidence:['[MT-ADS, MT-FORMATS] Detail.','[FRAMEWORK] {"goal":"goal"}'],metric:2};
 assert.deepEqual(cleanTestingReadoutCopy(source),{summary:'Keep Video4 — Actual Ad Name.',evidence:['Detail.','[FRAMEWORK] {"goal":"goal"}'],metric:2});
 assert.equal(source.summary,'OV-DECISIONS: Keep Video4 — Actual Ad Name.');
});
