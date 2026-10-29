"use client";

import { useEffect } from "react";
// The server accepts the selected period on the initial shared-link request.
// Consume only the marker so subsequent refreshes start from the default period.
export function ResetPeriodOnReload() {
 useEffect(() => {
  // App Router installs its History API wrapper in an effect; defer until it
  // is present so useSearchParams and the address bar both drop the marker.
  const timer = window.setTimeout(() => {
   const url = new URL(window.location.href);
   if (url.searchParams.get("shared") !== "1") return;
   url.searchParams.delete("shared");
   window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, 0);
  return () => window.clearTimeout(timer);
 }, []);
 return null;
}
