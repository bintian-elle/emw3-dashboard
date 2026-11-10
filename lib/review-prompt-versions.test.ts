import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {readReviewPromptVersions,writeReviewPromptVersion} from './review-prompt-versions.ts';

test('local prompt versions remain isolated and cannot overwrite the same revision',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'review-prompt-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const version={id:'id-1',prompt_id:'google-search',revision:1};
 await writeReviewPromptVersion(dir,version);
 assert.deepEqual(await readReviewPromptVersions(dir),[version]);
 await assert.rejects(writeReviewPromptVersion(dir,{...version,id:'id-2'}),/Conflict/);
 assert.deepEqual(await readReviewPromptVersions(dir),[version]);
});
