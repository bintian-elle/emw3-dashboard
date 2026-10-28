import { pathToFileURL } from 'node:url';
import nextEnv from '@next/env';

// Keep the credential on the local host: never use an externally configured URL.
const endpoint = 'http://127.0.0.1:3000/api/testing/social-refresh';

/** One scheduled attempt. API failure or an incomplete response is an error. */
export async function refreshTestingSocial({ secret, request = fetch } = {}) {
  if (!secret?.trim()) throw new Error('An internal refresh secret is not configured.');
  let response;
  try {
    response = await request(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret.trim()}` },
      signal: AbortSignal.timeout(300_000),
    });
  } catch {
    throw new Error('Social data refresh could not reach the local dashboard.');
  }
  if (!response.ok) {
    if (response.status === 429) throw new Error('Social data refresh was rate limited; existing data is unchanged.');
    throw new Error(`Social data refresh failed (HTTP ${response.status}); existing data is unchanged.`);
  }
  let body;
  try { body = await response.json(); } catch { throw new Error('Social data refresh returned an invalid response.'); }
  if (typeof body?.updatedAt !== 'string' || !Number.isFinite(Date.parse(body.updatedAt))) {
    throw new Error('Social data refresh did not confirm an update time.');
  }
  return { updatedAt: new Date(body.updatedAt).toISOString(), skipped: body.skipped === true };
}

async function main() {
  nextEnv.loadEnvConfig(process.cwd());
  const secret = process.env.CRON_SECRET?.trim() || process.env.AI_WORKER_SECRET?.trim();
  try {
    const result = await refreshTestingSocial({ secret });
    console.log(JSON.stringify({ status: result.skipped ? 'already_current' : 'updated', updatedAt: result.updatedAt }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Social data refresh failed.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
