"use client";
import {currentPmaxReadout} from "@/lib/pmax-testing-performance";
import { cleanTestingReadoutCopy } from "@/lib/testing-readout-copy";

import AskAIButton from "@/components/application/ai/ask-ai-button";
import { useTestingAiScope } from "./testing-ai";
import { scrollToCampaign } from "./campaign-navigator";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import type { SiteLanguage } from "@/lib/site-language";
import { useEffect, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { RiArrowDownSLine, RiArrowUpSLine } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { usePathname } from "next/navigation";
import { Chip } from "@/components/base/badges/chip";
import { cx } from "@/utils/cx";
import type { TestingFrameworkKey, TestingFramework, ReadoutMetric } from "@/lib/testing-framework";
import { testingReadoutKey, type CachedTestReadout, type CachedPeriodReadout, type ReadoutPeriod } from "@/lib/testing-readout-contract";

type FrameworkEntry = { channel?: string; test_id?: string; campaign_name?: string; test_goal?: string | null; hypothesis?: { text?: string | null; basis?: TestingFramework["hypothesisBasis"] } };
type CachedPayload = Partial<CachedPeriodReadout> & { _translation_pending?: boolean; _translation_error?: boolean; channel_frameworks?: FrameworkEntry[]; test_frameworks?: FrameworkEntry[] };
type ReadoutRecords = Record<string, CachedPayload>;
const pendingLoads = new Map<string, { expires: number; request: Promise<ReadoutRecords> }>();
const subscribeHydration = () => () => {};
const clientHydration = () => true;
const serverHydration = () => false;
const channelNames: Record<TestingFrameworkKey, string> = { overview: "Overview", "google-search": "Google Search", "google-pmax": "Google PMAX", "google-demand-gen": "Demand Gen", meta: "Meta", "reddit-awareness": "Reddit", "reddit-conversion": "Reddit", social: "Social Media", edm: "EDM" };
function loadCachedReadouts(keys: string[], language: SiteLanguage) {
  const uniqueKeys = [...new Set(keys)];
  const cacheKey = `${language}:${[...uniqueKeys].sort().join("|")}`;
  const existing = pendingLoads.get(cacheKey);
  if (existing && existing.expires > Date.now()) return existing.request;
  const query = new URLSearchParams({ language });
  uniqueKeys.forEach(key => query.append("key", key));
  const request = fetch(`/api/testing/readouts?${query}`, { cache: "no-store" }).then(async response => {
    if (!response.ok) throw new Error("Cached readouts unavailable");
    const result = await response.json() as { records?: Array<{ cache_key: string; payload: CachedPayload }> };
    return Object.fromEntries((result.records ?? []).map(record => [record.cache_key, record.payload])) as ReadoutRecords;
  });
  const entry = { expires: Date.now() + 25000, request };
  pendingLoads.set(cacheKey, entry);
  void request.catch(() => { if (pendingLoads.get(cacheKey) === entry) pendingLoads.delete(cacheKey); });
  return request;
}
function formatDeltas(test: CachedTestReadout): ReadoutMetric[] {
  const signed = (value: number, suffix: string) => `${value > 0 ? "+" : ""}${value.toFixed(2)}${suffix}`;
  return (test.delta?.metrics ?? []).flatMap(item => {
    const value = item.percentage_point_delta != null ? signed(item.percentage_point_delta, " pp") : item.relative_delta_pct != null ? signed(item.relative_delta_pct, "%") : item.absolute_delta != null ? signed(item.absolute_delta, "") : null;
    return value == null ? [] : [{ label: item.name, value, detail: item.interpretation || test.delta?.comparison_label || undefined }];
  });
}

export function TestReadout({ channel, testIdentity, period, standalone = false, children }: {
  channel?: TestingFrameworkKey; testIdentity?: string; period?: ReadoutPeriod | null; standalone?: boolean; children?: ReactNode;
}) {
  const chat=useTestingAiScope(channel,testIdentity,period);
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydration, serverHydration);
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const pathname = usePathname();
  const overviewDetailsId = useId();
  const campaignId = useId();
  const detailsId = useId();
  const frameworkId = useId();
  const controlledIds = `${frameworkId} ${detailsId}`;
  const collapsible = Boolean(children && !standalone && testIdentity);
  const campaignKey = [channel ?? "", testIdentity ?? "", period?.start ?? "", period?.end ?? ""].join("|");
  const [expandedCampaignKey, setExpandedCampaignKey] = useState<string | null>(null);
  const expanded = expandedCampaignKey === campaignKey;
  const [expandedOverviewKey,setExpandedOverviewKey] = useState<string|null>(null);
  const showCreativeDetails = channel !== "overview";
  const staticKey = period?.concludedTestId ? testingReadoutKey(period)! : "framework:v1";
  const socialKey = "period:social-lifetime";
  const periodKey = period ? testingReadoutKey(period) : null;
  const requestKey = [language, staticKey, channel ?? "", periodKey ?? "", testIdentity ?? ""].join("|");
  const [cached, setCached] = useState<{ key: string; records: ReadoutRecords } | null>(null);
  useEffect(() => {
    if (!channel) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + 90 * 60 * 1000;
    const load = async () => {
      try {
        const records = await loadCachedReadouts([...(channel === "overview" ? [socialKey] : [staticKey]), ...(periodKey ? [periodKey] : [])], language);
        if (cancelled) return;
        setCached({ key: requestKey, records });
        if (((!periodKey || records[periodKey]) && (channel !== "overview" || records[socialKey]) && !Object.values(records).some(record => record._translation_pending)) || Date.now() >= deadline) return;
      } catch { if (cancelled) return; }
      if (Date.now() < deadline) timer = setTimeout(() => { void load(); }, 30000);
    };
    void load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [requestKey, periodKey, staticKey, channel, pathname, language]);
  const records = cached?.key === requestKey ? cached.records : undefined;
  const staticPayload = records?.[staticKey];
  const framework = channel === "overview" ? undefined : staticPayload?.test_frameworks?.find(item => item.test_id === testIdentity || item.campaign_name === testIdentity)
    ?? staticPayload?.channel_frameworks?.find(item => item.channel === (channel ? channelNames[channel] : undefined));
  const savedPeriodResult = periodKey ? records?.[periodKey] : undefined;
  const periodResult = currentPmaxReadout(savedPeriodResult,channel) ? savedPeriodResult : undefined;
  const test = periodResult?.tests?.find(item => item.test_id === testIdentity || item.campaign_name === testIdentity);
  const summary = test?.summary || (testIdentity === "overview" ? periodResult?.overview?.executive_summary : null);
  const overview = testIdentity === "overview" ? periodResult?.overview : undefined;
  const socialSummary = channel === "overview" ? records?.[socialKey]?.tests?.find(item => item.test_id === "social-selected-posts")?.summary : null;
  const edmBrief = overview ? periodResult?.tests?.filter(item => item.channel === "EDM" && item.summary).map(item => `EDM: ${item.summary}`) ?? [] : [];
  const socialEdmBrief = socialSummary ? [...edmBrief, `${t("Social Media · Lifetime", "社交媒体 · 全周期")}: ${socialSummary}`] : edmBrief;
  const deltas = test ? formatDeltas(test) : [];
  // All analytical copy comes from a successful saved AI result. Missing cache
  // must never briefly expose a hand-written goal, summary or old-period answer.
  const dataSection = children ? <section aria-label="Test performance data" className="min-w-0 border-y border-border-table">
    {children}
  </section> : null;
  const frameworkSection = (
    framework && <section aria-label="Test framework" className={cx("border-b border-border-table bg-background-secondary-default/50", standalone && "mb-6 overflow-hidden rounded-3xl border border-border-button-default")}>
      {language === "zh" && staticPayload?._translation_pending && <p role="status" className="px-5 pt-4 text-caption-1-regular text-text-secondary">中文翻译正在准备，暂显示已保存的英文目标与假设。</p>}
      {language === "zh" && staticPayload?._translation_error && <p role="status" className="px-5 pt-4 text-caption-1-regular text-text-secondary">中文翻译暂不可用，暂显示已保存的英文目标与假设。</p>}
      {framework && <div className="grid gap-4 p-5 sm:grid-cols-2">
        {framework.test_goal && <div className="rounded-2xl border border-border-table bg-background-primary-default p-4"><p className="text-caption-1-semibold uppercase tracking-wide text-text-tertiary">{t("Test goal", "测试目标")}</p><p className="mt-3 text-body-regular text-text-primary">{framework.test_goal}</p></div>}
        {framework.hypothesis?.text && <div className="rounded-2xl border border-border-table bg-background-primary-default p-4"><p className="text-caption-1-semibold uppercase tracking-wide text-text-tertiary">{t("Hypothesis", "测试假设")}</p><p className="mt-3 text-body-regular text-text-primary">{framework.hypothesis.text}</p></div>}
      </div>}
    </section>
  );
  const analysisSection = (
    (summary || (framework && period && !periodKey)) && <section aria-label="Test readout" className={cx("border-t-2 border-border-button-default bg-background-secondary-default/40", standalone && "my-6 overflow-hidden rounded-3xl border bg-background-primary-default")}>
      {language === "zh" && periodResult?._translation_pending && <p role="status" className="px-5 pt-4 text-caption-1-regular text-text-secondary">中文翻译正在准备，暂显示已保存的英文分析。</p>}
      {language === "zh" && periodResult?._translation_error && <p role="status" className="px-5 pt-4 text-caption-1-regular text-text-secondary">中文翻译暂不可用，暂显示已保存的英文分析。</p>}
      {period && !periodKey && <p className="p-5 text-body-2-regular text-text-secondary">{t("Select Last Week, Week-to-date or Month-to-date to view saved analysis.", "选择上周、本周至今或本月至今，查看已保存的分析。")}</p>}
      {summary && <div className="p-5">
        {!collapsible && <div className="rounded-3xl border border-status-blue-background bg-status-blue-background/40 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-caption-1-semibold uppercase tracking-wide text-status-blue-text">{overview ? t("Executive Summary", "执行摘要") : t("Test summary", "测试总结")}</p></div>
          <p className="mt-3 text-body-medium text-text-primary">{summary}</p>
        </div>}
        {test?.recommended_action && <div className="mt-4 rounded-2xl border border-border-table bg-background-primary-default p-5"><p className="mb-2 text-body-medium text-text-primary">{t("Recommended next step", "下一步建议")}</p><ReadoutText text={test.recommended_action}/></div>}
        {overview && <div className="mt-4"><ReadoutList title="Optimization priorities" items={overview.recommended_actions} columns/>
          {socialEdmBrief.length > 0 && <div className="mt-4 border-t border-border-table pt-4"><ReadoutList title="Social Media & EDM" items={socialEdmBrief} columns/></div>}
          <div className="mt-4"><Button variant="secondary" size="small" aria-expanded={expandedOverviewKey===requestKey} aria-controls={overviewDetailsId} trailingIcon={expandedOverviewKey===requestKey?RiArrowUpSLine:RiArrowDownSLine} onClick={()=>setExpandedOverviewKey(previous=>previous===requestKey?null:requestKey)}>{expandedOverviewKey===requestKey?t("Hide supporting insights", "收起详细洞察"):t("View all insights and data coverage", "查看全部洞察与数据覆盖")}</Button></div>
          {expandedOverviewKey===requestKey && <div id={overviewDetailsId} className="mt-4 grid gap-5 rounded-2xl border border-border-table bg-background-secondary-default p-4"><ReadoutList title="Key insights" items={overview.key_findings}/><ReadoutList title="Data coverage" items={overview.data_gaps}/></div>}
        </div>}
        {test?.delta && <div className="mt-5 rounded-2xl border border-border-table bg-background-primary-default p-5">
          <div className="flex flex-wrap items-center gap-2"><p className="text-caption-1-semibold uppercase tracking-wide text-text-tertiary">{t("Delta", "差异")} {test.delta.comparison_label ? ` · ${test.delta.comparison_label}` : ""}</p>{test.confidence && <Chip variant="caption" color={deltas.length ? "blue" : "soft"}>{language === "zh" ? ({directional:"方向性信号",pending:"待确认",insufficient_data:"数据不足",not_assessed:"尚未评估",not_assessable:"暂无法判断",confirmed:"已确认"}[test.confidence] ?? test.confidence.replaceAll("_", " ")) : test.confidence.replaceAll("_", " ")}</Chip>}</div>
          {deltas.length > 0 && <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{deltas.map(delta => <div key={delta.label} className="min-w-0 rounded-xl bg-background-secondary-default p-4"><dt className="text-caption-1-semibold text-text-tertiary">{delta.label}</dt><dd className="mt-1 text-body-medium tabular-nums text-text-primary">{delta.value}</dd>{delta.detail && <p className="mt-1 text-caption-2-regular text-text-secondary">{delta.detail}</p>}</div>)}</dl>}

        </div>}
        {showCreativeDetails && <div className="mt-6 border-t border-border-table pt-6"><ReadoutList title="Performance analysis" items={test?.asset_insights}/></div>}
        {showCreativeDetails && <div className="mt-6 border-t border-border-table pt-6"><ReadoutList title="Evidence and sources" items={test?.evidence?.filter(value=>!value.startsWith("[FRAMEWORK]"))}/></div>}
        {(showCreativeDetails && test?.data_gaps?.length) ? <div className="mt-5 rounded-2xl border border-border-table bg-background-secondary-default p-4"><ReadoutList title="Data coverage" items={overview?.data_gaps ?? test?.data_gaps}/></div> : null}
      </div>}
    </section>
  );
  const collapse = () => { setExpandedCampaignKey(null); if (collapsible) scrollToCampaign(campaignId); };
  const detailsToggle = <Button type="button" variant="secondary" size="small" className="min-h-10" disabled={!hydrated} aria-expanded={expanded} aria-controls={collapsible ? controlledIds : detailsId} trailingIcon={expanded ? RiArrowUpSLine : RiArrowDownSLine} onClick={() => expanded ? collapse() : setExpandedCampaignKey(campaignKey)}>{expanded ? t("Hide details", "收起详情") : t("View detailed analysis", "查看详细分析")}</Button>;
  const savedAnalysis = analysisSection || <p className="p-5 text-body-regular text-text-secondary">{cached?.key !== requestKey ? t("Loading saved analysis…", "正在读取已保存的分析…") : t("No saved AI analysis for this reporting period.", "此时间区间暂无已保存的 AI 分析。")}</p>;
  const detailsSection = <div id={detailsId} hidden={!expanded}>{savedAnalysis}{expanded && <div className="border-t border-border-table p-5"><Button type="button" variant="secondary" size="small" aria-controls={collapsible ? controlledIds : detailsId} aria-expanded={expanded} trailingIcon={RiArrowUpSLine} onClick={collapse}>{t("Hide details", "收起详情")}</Button></div>}</div>;
  const summarySection = channel!=="overview"&&children ? <section className={cx(standalone ? "mb-6" : "mt-4", "overflow-hidden rounded-3xl border border-border-table bg-background-primary-default")}><div className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-caption-1-semibold text-status-blue-text">{t("AI Summary","AI 摘要")}</p><AskAIButton disabled={!hydrated} open={chat.isOpen} onClick={chat.open} label={t("Ask AI","询问 AI")}/></div>{summary&&!expanded&&<ReadoutText text={summary}/>}<div className="mt-3">{detailsToggle}</div></div>{detailsSection}</section> : analysisSection;
  if (!collapsible) return standalone ? <>{summarySection}{frameworkSection}{dataSection}</> : <>{frameworkSection}{dataSection}{summarySection}</>;
  return <div id={campaignId} data-campaign-anchor data-campaign-name={testIdentity} data-campaign-channel={channel ? channelNames[channel] : "Google Search"} tabIndex={-1} className="outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
    <div className={cx("px-5 py-4", expanded && "border-b border-border-table")}>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-caption-1-semibold text-status-blue-text">{t("AI Summary", "AI 摘要")}</p><AskAIButton disabled={!hydrated} open={chat.isOpen} onClick={chat.open} label={t("Ask about this campaign", "追问此 Campaign")}/></div>
      {summary ? <div className={cx("mt-2", !expanded && "line-clamp-3")}><ReadoutText text={summary}/></div> : <p className="mt-2 text-body-regular text-text-secondary">{cached?.key !== requestKey && channel ? t("Loading saved summary…", "正在读取已保存的摘要…") : t("No saved AI summary for this reporting period.", "此时间区间暂无已保存的 AI 摘要。")}</p>}
      {language === "zh" && periodResult?._translation_pending && <p role="status" className="mt-2 text-caption-1-regular text-text-secondary">中文翻译正在准备，暂显示英文摘要。</p>}
      {language === "zh" && periodResult?._translation_error && <p role="status" className="mt-2 text-caption-1-regular text-text-secondary">中文摘要暂不可用，暂显示英文。</p>}
    </div>
    <div id={frameworkId} hidden={!expanded}>{frameworkSection}</div>
    {dataSection}
    <div className="px-5 py-4">{detailsToggle}</div>
    {detailsSection}
  </div>;
}


function ReadoutText({text}:{text:string}) {
  const cleaned=cleanTestingReadoutCopy(text);
  const parts=cleaned.split(/(https?:\/\/[^\s<>，。；：！？、（）「」《》]+[^\s<>.,;:)\]，。；：！？、（）「」《》])/g);
  return <p className="break-words text-body-regular text-text-secondary">{parts.map((part,index)=>/^https?:\/\//.test(part)?<a key={index} href={part} target="_blank" rel="noreferrer" className="break-words text-accent-600 underline outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">{part}</a>:part)}</p>;
}
function ReadoutList({title,items,columns=false}:{title:string;items?:string[];columns?:boolean}) {
  const { language } = useSiteLanguage();
  const titles: Record<string,string> = {"Optimization priorities":"优化优先事项","Social Media & EDM":"社交媒体与 EDM","Key insights":"关键洞察","Data coverage":"数据覆盖","Performance analysis":"表现分析","Evidence and sources":"依据与来源"};
  if(!items?.length)return null;
  return <div><h3 className="text-body-medium text-text-primary">{language === "zh" ? titles[title] ?? title : title}</h3><ul className={cx("mt-3 grid list-disc gap-4 pl-5",columns && "lg:grid-cols-2 lg:gap-x-8")}>{items.map((item,index)=><li key={index} className="text-text-secondary"><ReadoutText text={item}/></li>)}</ul></div>;
}
