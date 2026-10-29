import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TestingReadoutCacheRecord } from './ai-job-queue';

const directory = () => process.env.CONCLUDED_READOUT_CACHE_DIR || path.join(process.cwd(), '.state/testing-concluded-readouts');
function file(key: string) {
  if (!/^period:concluded:[a-z0-9-]+$/.test(key)) return null;
  return path.join(directory(), `${key.slice('period:concluded:'.length)}.json`);
}
export async function readConcludedLocalReadout(key: string): Promise<TestingReadoutCacheRecord | null> {
  const target = file(key); if (!target) return null;
  try {
    const record = JSON.parse(await readFile(target, 'utf8')) as TestingReadoutCacheRecord;
    const payload = record.payload as { period?: { concludedTestId?: string }; tests?: unknown[] };
    return record.cache_key === key && record.updated_at && payload?.period?.concludedTestId === key.slice('period:concluded:'.length) && Array.isArray(payload.tests) ? record : null;
  } catch { return null; }
}
const writes = new Map<string, Promise<void>>();
export async function writeConcludedLocalReadout(record: TestingReadoutCacheRecord) {
  const target = file(record.cache_key); if (!target) return;
  const prior = writes.get(record.cache_key) ?? Promise.resolve();
  const next = prior.then(async () => {
  const existing = await readConcludedLocalReadout(record.cache_key);
  if (existing && Date.parse(String(existing.updated_at)) > Date.parse(String(record.updated_at))) return;
  await mkdir(directory(), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${randomUUID()}.tmp`;
  try { await writeFile(temporary, JSON.stringify(record), { mode: 0o600 }); await rename(temporary, target); }
  catch { /* Shared data remains authoritative when the local mirror is unavailable. */ }
  }).catch(() => {});
  writes.set(record.cache_key,next); await next;
  if (writes.get(record.cache_key) === next) writes.delete(record.cache_key);
}

export async function readConcludedLocalTranslation(record: TestingReadoutCacheRecord, sourceHash: string): Promise<TestingReadoutCacheRecord | null> {
  const target = file(record.cache_key); if (!target) return null;
  try {
    const saved = JSON.parse(await readFile(`${target}.zh`, 'utf8')) as { sourceHash: string; record: TestingReadoutCacheRecord };
    return saved.sourceHash === sourceHash && saved.record.cache_key === record.cache_key ? saved.record : null;
  } catch { return null; }
}
export async function writeConcludedLocalTranslation(record: TestingReadoutCacheRecord, sourceHash: string) {
  const target = file(record.cache_key); if (!target) return;
  try {
    await mkdir(directory(), { recursive: true, mode: 0o700 });
    const temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify({ sourceHash, record }), { mode: 0o600 });
    await rename(temporary, `${target}.zh`);
  } catch { /* Shared translation remains authoritative. */ }
}
