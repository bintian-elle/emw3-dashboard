"use client";

import { createContext } from "react";

export const AskDockContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
  docked: boolean;
  slot: HTMLElement | null;
  topbarHeight: number;
  width: number;
  resize: (width: number) => void;
} | null>(null);

const narrowQuery = "(max-width:767px)";
export const askDockNarrow = () => window.matchMedia(narrowQuery).matches;
export function subscribeAskDockNarrow(callback: () => void) {
  const media = window.matchMedia(narrowQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
