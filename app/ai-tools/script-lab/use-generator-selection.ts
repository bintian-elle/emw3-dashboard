"use client";

import { useSyncExternalStore } from "react";

const changeEvent = "script-lab:generator:change";
const memory = new Map<string, string>();

export function readGeneratorStorage(key: string) {
  if (memory.has(key)) return memory.get(key)!;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeGeneratorStorage(key: string, value: string) {
  if (readGeneratorStorage(key) === value) return;
  try {
    localStorage.setItem(key, value);
    memory.delete(key);
  } catch {
    memory.set(key, value);
  }
  window.dispatchEvent(new Event(changeEvent));
}

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

export function useGeneratorStorage(key: string) {
  return useSyncExternalStore(subscribe, () => readGeneratorStorage(key), () => null);
}

function parseSelection(value: string | null) {
  if (value === null) return null;
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids) ? new Set<string>(ids.filter(id => typeof id === "string")) : null;
  } catch {
    return null;
  }
}

export function useGeneratorSelection(scope: string, defaults: ReadonlySet<string>) {
  const key = `emw3:script-lab:biceek:selection:v1:${scope}`;
  const snapshot = useGeneratorStorage(key);

  function update(change: (previous: ReadonlySet<string>) => Set<string>) {
    writeGeneratorStorage(key, JSON.stringify([...change(parseSelection(readGeneratorStorage(key)) ?? defaults)]));
  }

  return [parseSelection(snapshot) ?? defaults, update] as const;
}
