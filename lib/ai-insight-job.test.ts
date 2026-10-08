import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bilingualInsightJobId } from './ai-insight-job.ts';

test('English and Chinese requests deduplicate while different comparisons stay separate', () => {
  const input={range:{start:'2026-09-29',end:'2026-10-05'},comparison:{start:'2026-09-22',end:'2026-09-28'}};
  const english={...input,language:'en'},chinese={...input,language:'zh'};
  assert.equal(bilingualInsightJobId(english),bilingualInsightJobId(chinese));
  assert.notEqual(bilingualInsightJobId(input),bilingualInsightJobId({...input,comparison:{start:'2025-09-29',end:'2025-10-05'}}));
});
