"use client";

import { useEffect, useState } from "react";
import { useGeneratorStorage, writeGeneratorStorage } from "./use-generator-selection";
import type { VideoBatch, VideoJob } from "@/lib/script-lab-video-jobs";

export function videoEndpoint(customer: boolean) {
  return customer ? "/script-lab/prepare" : "/ai-tools/script-lab/prepare";
}

export function useVideoJobs(customer: boolean, active = true, controlScope?: string) {
  const endpoint = videoEndpoint(customer);
  const sharedKey = `script-lab:video-jobs:v1:${endpoint}`;
  const key = controlScope ? `${sharedKey}:controls:${controlScope}` : sharedKey;
  const shared = useGeneratorStorage(sharedKey);
  const snapshot = useGeneratorStorage(key);
  const jobs = parseStored<VideoJob[]>(snapshot ?? shared) ?? [];
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch(controlScope ? `${endpoint}?controls=1` : endpoint, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("jobs_unavailable");
        const result = await response.json() as { jobs: VideoJob[] };
        if (!controller.signal.aborted && Array.isArray(result.jobs)) writeGeneratorStorage(key, JSON.stringify(result.jobs));
      } catch {
        // Keep the last successful snapshot during reconnects.
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2500);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [endpoint, active, key, controlScope]);
  return jobs;
}

export function parseStored<T>(raw: string | null): T | undefined {
  try { return raw ? JSON.parse(raw) as T : undefined; } catch { return undefined; }
}

export function useVideoBatch(customer: boolean, batchId: string | null) {
  const endpoint = videoEndpoint(customer);
  const key = `script-lab:video-batch:v1:${endpoint}:${batchId ?? ""}`;
  const loaded = parseStored<VideoBatch>(useGeneratorStorage(key));
  const [failedId, setFailedId] = useState<string>();
  useEffect(() => {
    if (!batchId) return;
    const controller = new AbortController();
    void fetch(`${endpoint}?batch=${batchId}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (response.status === 404 && !controller.signal.aborted) {
          writeGeneratorStorage(key, "");
          setFailedId(batchId);
          return;
        }
        if (!response.ok) throw new Error("batch_unavailable");
        const result = await response.json() as VideoBatch;
        if (!controller.signal.aborted && result.batch_id === batchId) {
          writeGeneratorStorage(key, JSON.stringify(result));
          setFailedId(undefined);
        }
      }).catch(() => { if (!controller.signal.aborted) setFailedId(batchId); });
    return () => controller.abort();
  }, [endpoint, batchId, key]);
  const batch = loaded?.batch_id === batchId ? loaded : undefined;
  return { batch, failed: !batch && failedId === batchId };
}
