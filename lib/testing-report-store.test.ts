import {test} from 'node:test';
import assert from 'node:assert/strict';
import {assembleStoredBundle} from './testing-report-store.ts';

test('assembles all stored bilingual channels under one run',()=>{const value=assembleStoredBundle('run-1','2026-10-27','2026-11-02',[{channel:'meta',report:{en:{run_id:'run-1'},zh:{run_id:'run-1'}}}]);assert.equal(value.reports.meta.zh.run_id,'run-1');assert.deepEqual(value.period,{start:'2026-10-27',end:'2026-11-02'});});
test('rejects mixed runs or incomplete languages',()=>{assert.throws(()=>assembleStoredBundle('a','2026-10-27','2026-11-02',[{channel:'meta',report:{en:{run_id:'b'},zh:{run_id:'a'}}}]));assert.throws(()=>assembleStoredBundle('a','2026-10-27','2026-11-02',[{channel:'meta',report:{en:{run_id:'a'}}}]));});
