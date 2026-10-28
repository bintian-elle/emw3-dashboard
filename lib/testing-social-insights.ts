/** Only an explicit unsupported metric permits a partial set of insights. */
export class InstagramUnsupportedMetric extends Error {}

export function isInstagramUnsupportedMetric(code: unknown, message: unknown): boolean {
  if (code !== 100 || typeof message !== "string") return false;
  return /(?:metric.{0,80}(?:unsupported|not supported|not available|invalid|must be|does not exist|unknown)|(?:unsupported|not supported|invalid|valid|unknown).{0,80}metric)/i.test(message);
}

/** Load combined Instagram metrics with a fallback for unsupported metrics. */
export async function fetchInstagramInsights<T>(metrics: readonly string[], read: (metrics: string) => Promise<T[]>): Promise<T[]> {
  try { return await read(metrics.join(",")); } catch (error) {
    if (!(error instanceof InstagramUnsupportedMetric)) throw error;
    const values: T[] = [];
    for (const metric of metrics) {
      try { values.push(...await read(metric)); } catch (error) {
        if (!(error instanceof InstagramUnsupportedMetric)) throw error;
      }
    }
    return values;
  }
}
