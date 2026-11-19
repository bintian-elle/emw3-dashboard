"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NovaDataRefresh } from "@/app/bluevua/testing/testing-data-refresh";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

export function useMarketRefresh(updatedAt: string | null) {
  const router = useRouter();
  const latest = useRef(updatedAt);
  const busy = useRef(false);
  const [updating,setUpdating] = useState(false);
  const [canRefresh,setCanRefresh] = useState(false);
  const [error,setError] = useState<"failed" | "busy" | null>(null);

  useEffect(() => { latest.current = updatedAt; }, [updatedAt]);
  useEffect(() => {
    let active = true;
    let check: AbortController | undefined;
    const load = async () => {
      if (check || busy.current || document.hidden) return;
      const controller = new AbortController();
      check = controller;
      try {
        const response = await fetch("/api/biceek/refresh", { signal: controller.signal, cache: "no-store" });
        if (!response.ok || !active) return;
        const data = await response.json();
        if (!active) return;
        setCanRefresh(data.canRefresh);
        if (data.refreshedAt && data.refreshedAt !== latest.current) {
          latest.current = data.refreshedAt;
          router.refresh();
        }
      } catch {
        // Keep rendering the last successful publication.
      } finally {
        check = undefined;
      }
    };
    void load();
    const timer = window.setInterval(() => void load(),60_000);
    window.addEventListener("focus",load);
    return () => { active=false; check?.abort(); window.clearInterval(timer); window.removeEventListener("focus",load); };
  },[router]);

  async function refresh() {
    if (busy.current || !canRefresh) return;
    busy.current=true;
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch("/api/biceek/refresh", { method:"POST" });
      if (!response.ok) { setError(response.status===429?"busy":"failed"); return; }
      const data = await response.json();
      latest.current = data.refreshedAt;
      router.refresh();
    } catch {
      setError("failed");
    } finally {
      busy.current=false;
      setUpdating(false);
    }
  }

  return {updatedAt,updating,canRefresh,error,refresh};
}

export function MarketRefresh({collapsed,state}:{collapsed:boolean;state:ReturnType<typeof useMarketRefresh>}) {
  const {language}=useSiteLanguage();
  const zh=language==="zh";
  const detail=state.error==="failed"?(zh?"刷新失败，继续显示上次数据。":"Refresh failed. Showing the last successful data.")
    :state.error==="busy"?(zh?"刚刚发起过刷新，请稍后再试。":"A refresh was requested recently. Try again shortly."):undefined;
  return <NovaDataRefresh collapsed={collapsed} updatedAt={state.updatedAt} updating={state.updating}
    disabled={!state.canRefresh} detail={detail} onRefresh={() => void state.refresh()}
    timeZone="Europe/London" timeZoneLabel={zh?"（伦敦时间）":"(London time)"}
    schedule={zh?"每日伦敦时间 08:00 开始刷新":"Daily refresh starts at 08:00 London time"} />;
}
