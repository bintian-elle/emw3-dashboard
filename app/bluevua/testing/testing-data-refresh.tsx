"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RiRefreshLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { IconButton } from "@/components/base/buttons/icon-button";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { cx } from "@/utils/cx";

type RefreshStatus = { updatedAt: string | null; refreshing: boolean; available: boolean; message?: string; messageCode?: string };
type RefreshChannel = "google-search" | "google-pmax" | "google-demand-gen" | "meta" | "reddit" | "edm" | "social" | "concluded" | "general";

type StatusEntry = { key: string; value: RefreshStatus };

export function testingRefreshChannel(pathname: string, concluded: boolean): RefreshChannel | null {
  if (pathname === "/bluevua/testing" || pathname === "/bluevua/testing/") return null;
  if (concluded || pathname.startsWith("/bluevua/testing/concluded") || pathname.startsWith("/bluevua/testing/google/concluded")) return "concluded";
  if (pathname === "/bluevua/testing/google" || pathname.startsWith("/bluevua/testing/google/search")) return "google-search";
  if (pathname.startsWith("/bluevua/testing/google/pmax")) return "google-pmax";
  if (pathname.startsWith("/bluevua/testing/google/demand-gen")) return "google-demand-gen";
  for (const channel of ["meta", "reddit", "edm", "social"] as const) {
    if (pathname === `/bluevua/testing/${channel}` || pathname.startsWith(`/bluevua/testing/${channel}/`)) return channel;
  }
  return "general";
}

function formatUpdatedAt(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function TestingDataRefresh({ channel, collapsed }: { channel: RefreshChannel; collapsed: boolean }) {
  const { language } = useSiteLanguage();
  const zh = language === "zh";
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") ?? undefined;
  const start = searchParams.get("start") ?? undefined;
  const end = searchParams.get("end") ?? undefined;
  const scope = new URLSearchParams({ channel });
  if (period) scope.set("period", period);
  if (start) scope.set("start", start);
  if (end) scope.set("end", end);
  const scopeKey = scope.toString();
  const [entry, setEntry] = useState<StatusEntry | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lastSeen = useRef(new Map<string, string | null>());
  const status = entry?.key === scopeKey ? entry.value : null;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      try {
        const response = await fetch(`/api/testing/data-refresh?${scopeKey}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("status unavailable");
        const data = await response.json() as RefreshStatus;
        if (cancelled) return;
        const previous = lastSeen.current.get(scopeKey);
        if (lastSeen.current.has(scopeKey) && data.updatedAt && data.updatedAt !== previous) router.refresh();
        lastSeen.current.set(scopeKey, data.updatedAt);
        setEntry({ key: scopeKey, value: data });
        setError("");
        timer = setTimeout(() => void load(), data.refreshing ? 2500 : 30000);
      } catch (cause) {
        if (cancelled || (cause instanceof Error && cause.name === "AbortError")) return;
        setError(zh ? "无法获取更新时间" : "Update time unavailable");
        timer = setTimeout(() => void load(), 30000);
      }
    };
    const onFocus = () => { if (timer) clearTimeout(timer); void load(); };
    void load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; if (timer) clearTimeout(timer); controller?.abort(); window.removeEventListener("focus", onFocus); };
  }, [scopeKey, router, zh, status?.refreshing]);

  const refresh = async () => {
    if (!status?.available || status.refreshing || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/testing/data-refresh", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ channel, period, start, end }),
      });
      const data = await response.json().catch(() => null) as (RefreshStatus & { error?: string }) | null;
      if (!response.ok || !data) {
        if (response.status === 429) throw new Error("rate_limited");
        throw new Error("refresh_failed");
      }
      lastSeen.current.set(scopeKey, data.updatedAt);
      setEntry({ key: scopeKey, value: data });
      if (!data.refreshing) router.refresh();
    } catch (cause) {
      setError(cause instanceof Error && cause.message === "rate_limited" ? (zh ? "刷新过于频繁，请稍后再试。现有缓存保留。" : "Too many refresh requests. Try again later. The existing cache is preserved.") : (zh ? "刷新失败，现有缓存保留，请稍后再试。" : "Refresh failed. The existing cache is preserved; try again later."));
    } finally {
      setBusy(false);
    }
  };

  const updating = busy || Boolean(status?.refreshing);
  const formatted = status?.updatedAt ? formatUpdatedAt(status.updatedAt, zh ? "zh-CN" : "en-US") : null;
  const timeLabel = formatted ? (zh ? `数据更新于 ${formatted}` : `Data updated ${formatted}`) : (zh ? "暂无数据更新时间" : "No data update time yet");
  const buttonLabel = updating ? (zh ? "正在刷新" : "Refreshing") : (zh ? "刷新数据" : "Refresh data");
  const disabled = !status?.available || updating;
  const setupMessage = status?.messageCode === "cache_setup_required" ? (zh ? "共享缓存尚未配置。" : "Shared cache setup is required.") : status?.messageCode === "cache_unavailable" ? (zh ? "共享缓存暂不可用，请稍后再试。" : "Shared cache unavailable. Try again later.") : status?.message;
  const detail = error || (!status?.available && setupMessage ? setupMessage : "");

  return <div className="mt-4 border-t border-separator-border pt-3 lg:shrink-0">
    <div className={cx("flex flex-col items-start gap-2", collapsed && "lg:hidden")}>
      <div className="min-w-0" aria-live="polite"><p className="break-words text-caption-1-regular text-text-secondary">{formatted ? <><strong className="text-caption-1-semibold">{zh ? "数据" : "Data"}</strong>{zh ? `更新于 ${formatted}` : ` updated ${formatted}`}</> : timeLabel}</p>{detail && <p className="mt-1 break-words text-caption-2-regular text-text-error-primary">{detail}</p>}</div>
      <Button type="button" variant="secondary" size="small" leadingIcon={RiRefreshLine} onClick={() => void refresh()} disabled={disabled} aria-label={buttonLabel} className="shrink-0 text-caption-1-regular">{buttonLabel}</Button>
    </div>
    {collapsed && <div className="hidden lg:flex lg:justify-center"><IconButton icon={RiRefreshLine} aria-label={`${buttonLabel}. ${timeLabel}${detail ? `. ${detail}` : ""}`} title={`${buttonLabel} · ${timeLabel}${detail ? ` · ${detail}` : ""}`} onClick={() => void refresh()} disabled={disabled}/></div>}
  </div>;
}
