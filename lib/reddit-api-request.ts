/** Bound account request bursts and coalesce identical reads across render requests. */
export function createRedditRequester({fetcher, pause = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)), concurrency = 3}: {
  fetcher: (endpoint: string, init: RequestInit) => Promise<Response>;
  pause?: (ms: number) => Promise<void>;
  concurrency?: number;
}) {
  const pending = new Map<string, Promise<unknown>>();
  let active = 0;
  const waiting: Array<() => void> = [];
  async function run(endpoint: string, init: RequestInit): Promise<unknown> {
    if (active >= concurrency) await new Promise<void>(resolve => waiting.push(resolve));
    else active++;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const response = await fetcher(endpoint, init);
        if (response.ok) return await response.json();
        if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 2) {
          throw new Error(`Reddit reporting is temporarily unavailable (HTTP ${response.status}). Please try again shortly.`);
        }
        const retryAfter = Number(response.headers.get("retry-after"));
        // Consume failed responses before retrying, without exposing API response bodies.
        await response.arrayBuffer();
        await pause(Math.min(10000, Math.max(500 * 2 ** attempt, Number.isFinite(retryAfter) ? retryAfter * 1000 : 0)));
      }
      throw new Error("Reddit reporting is temporarily unavailable.");
    } finally {
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  }
  return function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
    const key = JSON.stringify([endpoint, init.method ?? "GET", init.body ?? null]);
    let result = pending.get(key);
    if (!result) {
      result = run(endpoint, init).finally(() => pending.delete(key));
      pending.set(key, result);
    }
    return result as Promise<T>;
  };
}
