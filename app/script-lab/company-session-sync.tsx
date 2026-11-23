"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SCRIPT_LAB_COMPANY_ORIGIN, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";

export function CompanySessionSync({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (window.location.hostname !== SCRIPT_LAB_PUBLIC_HOST) return;
    const controller = new AbortController();
    async function sync() {
      const response = await fetch(`${SCRIPT_LAB_COMPANY_ORIGIN}/api/script-lab/company-session`, {
        credentials: "include", cache: "no-store", signal: controller.signal,
      });
      if (response.status === 401 && signedIn) {
        const cleared = await fetch("/script-lab/company-session", { method: "DELETE", signal: controller.signal });
        if (cleared.ok) router.refresh();
        return;
      }
      if (!response.ok) return;
      const { grant } = await response.json();
      const session = await fetch("/script-lab/company-session", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ grant }), signal: controller.signal,
      });
      if (session.ok && !signedIn) router.refresh();
    }
    const refresh = () => { void sync().catch(() => { /* Visitors can browse and sign in explicitly. */ }); };
    refresh();
    window.addEventListener("focus", refresh);
    const renewal = window.setInterval(refresh, 10 * 60 * 1000);
    return () => {
      controller.abort();
      window.removeEventListener("focus", refresh);
      window.clearInterval(renewal);
    };
  }, [router, signedIn]);
  return null;
}
