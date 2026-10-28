import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { refreshTestingSocial } from './refresh-testing-social.mjs';

test('one request goes to the fixed local endpoint and returns the committed time', async () => {
  const calls = [];
  const result = await refreshTestingSocial({ secret: 'test-secret', request: async (...args) => {
    calls.push(args);
    return { ok: true, status: 200, json: async () => ({ updatedAt: '2026-10-28T08:15:00.000Z' }) };
  } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'http://127.0.0.1:3000/api/testing/social-refresh');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].headers.authorization, 'Bearer test-secret');
  assert.equal(result.updatedAt, '2026-10-28T08:15:00.000Z');
  assert.equal(result.skipped, false);
});

test('a same-day skip retains the previous update time', async () => {
  const result = await refreshTestingSocial({ secret: 'test-secret', request: async () => ({ ok: true, json: async () => ({ updatedAt: '2026-10-28T01:00:00.000Z', skipped: true }) }) });
  assert.deepEqual(result, { updatedAt: '2026-10-28T01:00:00.000Z', skipped: true });
});

test('rate limits and upstream failures do not retry or expose response content', async () => {
  for (const status of [429, 503]) {
    let calls = 0;
    await assert.rejects(refreshTestingSocial({ secret: 'test-secret', request: async () => {
      calls++;
      return { ok: false, status, json: async () => ({ error: 'private upstream detail' }) };
    } }), error => !error.message.includes('private upstream detail'));
    assert.equal(calls, 1);
  }
});

test('missing credential, network failure, or missing commit timestamp fails safely', async () => {
  await assert.rejects(refreshTestingSocial({ secret: '' }), /secret/);
  await assert.rejects(refreshTestingSocial({ secret: 'secret', request: async () => { throw new Error('private network detail'); } }), error => !error.message.includes('private network detail'));
  await assert.rejects(refreshTestingSocial({ secret: 'secret', request: async () => ({ ok: true, json: async () => ({}) }) }), /update time/);
});

test('Social timer runs one hour before the existing Testing readout timer', async () => {
  const [social, readout] = await Promise.all([
    readFile(new URL('../ops/emw3-testing-social-refresh.timer', import.meta.url), 'utf8'),
    readFile(new URL('../ops/emw3-testing-readouts.timer', import.meta.url), 'utf8'),
  ]);
  assert.match(social, /^OnCalendar=\*-\*-\* 08:15:00 UTC$/m);
  assert.match(readout, /^OnCalendar=\*-\*-\* 09:15:00 UTC$/m);
});
