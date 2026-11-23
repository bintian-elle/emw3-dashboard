import { useEffect, useMemo, useRef, useState } from "react";
import { ruleDimensions, type RuleDimensionDefinition, type ScriptLabRule } from "@/lib/script-lab-rules";
import { readGeneratorStorage, useGeneratorStorage, writeGeneratorStorage } from "./use-generator-selection";

type Library = { rules: ScriptLabRule[]; dimensions: readonly RuleDimensionDefinition[]; etag: string | null };

function parseLibrary(value: string | null): Library | null {
  if (!value) return null;
  try {
    const item = JSON.parse(value) as Library;
    return item && Array.isArray(item.rules) && Array.isArray(item.dimensions) ? item : null;
  } catch {
    return null;
  }
}

export function useScriptLabRules(endpoint: string, { enabled = true, cacheScope }: {
  enabled?: boolean;
  cacheScope?: string;
} = {}) {
  const key = cacheScope ? `emw3:script-lab:biceek:library:v2:${endpoint}:${cacheScope}` : "";
  const snapshot = useGeneratorStorage(key);
  const cached = useMemo(() => key ? parseLibrary(snapshot) : null, [key, snapshot]);
  const working = useRef<Library | null>(null);
  const [latest, setLatest] = useState<Library | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const mutationVersion = useRef(0);
  const current = cached ?? latest;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const baseline = key ? parseLibrary(readGeneratorStorage(key)) : null;
    const startedAt = mutationVersion.current;
    const etag = baseline?.etag;
    void fetch(endpoint, {
      signal: controller.signal, cache: "no-store",
      headers: typeof etag === "string" ? { "If-None-Match": etag } : undefined,
    }).then(async response => {
      if (response.status === 304 && baseline) {
        if (!controller.signal.aborted) setLoadError(false);
        return;
      }
      if (!response.ok) throw new Error("Could not load rules");
      const result = await response.json() as Omit<Library, "etag">;
      if (controller.signal.aborted || startedAt !== mutationVersion.current) return;
      const loaded = { ...result, etag: response.headers.get("ETag") };
      setLoadError(false);
      working.current = loaded;
      setLatest(loaded);
      if (key) writeGeneratorStorage(key, JSON.stringify(loaded));
    }).catch(() => { if (!controller.signal.aborted && !baseline) setLoadError(true); });

    return () => controller.abort();
  }, [enabled, endpoint, key, loadVersion]);

  useEffect(() => {
    if (!enabled || !key) return;
    function check() {
      if (document.visibilityState === "visible") setLoadVersion(version => version + 1);
    }
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [enabled, key]);

  function reload() {
    setLoadError(false);
    setLoadVersion(version => version + 1);
  }

  function updateLibrary(change: (library: Library) => Omit<Library, "etag">) {
    const baseline = (key ? parseLibrary(readGeneratorStorage(key)) : null) ?? working.current;
    if (!baseline) return;
    mutationVersion.current++;
    const updated = { ...change(baseline), etag: null };
    working.current = updated;
    setLatest(updated);
    if (key) writeGeneratorStorage(key, JSON.stringify(updated));
  }

  function setDimensions(change: (dimensions: readonly RuleDimensionDefinition[]) => readonly RuleDimensionDefinition[]) {
    updateLibrary(library => ({ ...library, dimensions: change(library.dimensions) }));
  }

  function applyRuleChange({ rule, id }: { rule?: ScriptLabRule; id?: string }) {
    updateLibrary(library => {
      const rules = !rule
        ? library.rules.filter(item => item.id !== id)
        : library.rules.some(item => item.id === rule.id)
          ? library.rules.map(item => item.id === rule.id ? rule : item)
          : [...library.rules, rule];
      return { ...library, rules };
    });
  }

  return { dimensions: current?.dimensions ?? ruleDimensions, setDimensions, rules: current?.rules ?? null, applyRuleChange, loadError, reload };
}
