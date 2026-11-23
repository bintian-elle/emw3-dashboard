"use client";

import { useSyncExternalStore } from "react";
import { createRoundOneBrief, isRoundOneAudience, type RoundOneAudienceCode } from "@/lib/script-lab-round-one";

type Batch = 0 | 1;
type RoundOneDraft = {
  audiences: RoundOneAudienceCode[];
  assignments: Record<string, Batch>;
  approved: string[];
};

const storageKey = "emw3:script-lab:biceek:round-one:v1";
const changeEvent = "emw3:script-lab:biceek:round-one";
const initial: RoundOneDraft = { audiences: ["COMM"], assignments: {}, approved: [] };
const initialSnapshot = JSON.stringify(initial);
let temporary: string | undefined;

function readSnapshot() {
  if (temporary !== undefined) return temporary;
  try {
    return window.localStorage.getItem(storageKey) ?? initialSnapshot;
  } catch {
    return initialSnapshot;
  }
}

function subscribe(listener: () => void) {
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", listener);
  };
}

function parse(snapshot: string): RoundOneDraft {
  try {
    const value = JSON.parse(snapshot);
    const audiences = Array.isArray(value?.audiences)
      ? [...new Set<RoundOneAudienceCode>(value.audiences.filter(isRoundOneAudience))]
      : initial.audiences;
    if (!audiences.includes("COMM")) audiences.unshift("COMM");
    const ids = audiences.map((audience) => createRoundOneBrief(audience).id);
    const assignments = Object.fromEntries(ids.flatMap((id) => {
      const batch = value?.assignments?.[id];
      return batch === 0 || batch === 1 ? [[id, batch]] : [];
    }));
    const approved = Array.isArray(value?.approved) ? ids.filter((id) => id in assignments && value.approved.includes(id)) : [];
    return { audiences, assignments, approved };
  } catch {
    return initial;
  }
}

export function useRoundOneDraft() {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, () => initialSnapshot);
  const update = (change: (current: RoundOneDraft) => RoundOneDraft) => {
    const next = JSON.stringify(change(parse(readSnapshot())));
    try {
      window.localStorage.setItem(storageKey, next);
      temporary = undefined;
    } catch {
      temporary = next;
    }
    window.dispatchEvent(new Event(changeEvent));
  };
  return [parse(snapshot), update] as const;
}
