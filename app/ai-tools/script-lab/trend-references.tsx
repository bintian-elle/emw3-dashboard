import { ChevronDown, ChevronUp, ExternalLink, Play, TrendingUp, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import type { LocalizedText } from "@/lib/script-lab-project";
import { emptyTrendFeed, trendMarkets, trendSources, type TrendFeed, type TrendItem, type TrendSource } from "@/lib/script-lab-trends";
import { useGeneratorStorage, writeGeneratorStorage } from "./use-generator-selection";
import styles from "./trends.module.css";
import candidateStyles from "./workbench.module.css";

type Translate = (text: LocalizedText) => string;

const metricNames: Record<string, LocalizedText> = {
  views: ["Views", "播放"], likes: ["Likes", "点赞"], comments: ["Comments", "评论"],
  ctr: ["CTR rank", "CTR 排位"], budget: ["Budget", "预算"], volume: ["Search volume", "搜索量"],
};
const names: Record<TrendSource, string> = { tiktok: "TikTok", instagram: "Instagram", google: "Google Trends" };
const marketNames: Record<typeof trendMarkets[number], LocalizedText> = {
  GB: ["United Kingdom", "英国"],
  US: ["United States", "美国"],
  DE: ["Germany", "德国"],
  NL: ["Netherlands", "荷兰"],
  FR: ["France", "法国"],
  CH: ["Switzerland", "瑞士"],
  ES: ["Spain", "西班牙"],
  IT: ["Italy", "意大利"],
};
function Preview({ item, customer, t }: { item: TrendItem; customer: boolean; t: Translate }) {
  const ref = useRef<HTMLVideoElement>(null);
  const video = item.kind === "ad"
    ? item.video ?? (item.mediaId && `${customer ? "/script-lab" : "/api/script-lab"}/trend-media/${item.mediaId}`)
    : item.video;
  function stop() {
    const player = ref.current;
    if (!player) return;
    player.pause();
    player.currentTime = 0;
  }
  return (
    <div className={styles.visual} onPointerEnter={event => {
      if (event.pointerType === "mouse" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        void ref.current?.play().catch(() => undefined);
      }
    }} onPointerLeave={stop}>
      {video ? <video ref={ref} src={video} poster={item.cover} muted playsInline preload="none"
        onTimeUpdate={event => { if (event.currentTarget.currentTime >= 3) event.currentTarget.pause(); }} />
        // Supplier thumbnail URLs are signed and can change between snapshots.
        // eslint-disable-next-line @next/next/no-img-element
        : item.cover ? <img src={item.cover} alt="" loading="lazy" />
        : <TrendingUp size={46} aria-hidden="true" />}
      {video ? <Dialog.Root onOpenChange={open => { if (open) stop(); }}>
        <Dialog.Trigger asChild>
          <button type="button" className={styles.playCover} aria-label={t([ `Play ${item.title}`, `播放 ${item.title}` ])}>
            <span className={styles.play}><Play size={20} aria-hidden="true" /></span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.playerOverlay} />
          <Dialog.Content className={styles.playerDialog} aria-describedby={undefined}>
            <header><Dialog.Title>{item.title}</Dialog.Title>
              <Dialog.Close aria-label={t(["Close video", "关闭视频"])}><X size={20} /></Dialog.Close>
            </header>
            <video src={video} poster={item.cover} controls autoPlay playsInline />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root> : item.kind === "video" && <a href={item.url} target="_blank" rel="noreferrer" aria-label={item.title} className={styles.play}><Play size={20} /></a>}
    </div>
  );
}

function CreativeSummary({ item, t }: { item: TrendItem; t: Translate }) {
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const body = useRef<HTMLDivElement>(null);
  const id = useId();
  const hook = item.hook ? t(item.hook) : "";
  const takeaway = item.takeaway ? t(item.takeaway) : "";
  const hookLabel = item.analysisBasis === "cover" ? t(["Cover hook", "封面钩子"]) : t(["Hook", "开头钩子"]);

  useEffect(() => {
    if (expanded || !body.current) return;
    const lines = Array.from(body.current.querySelectorAll("p"));
    const observer = new ResizeObserver(() => {
      setClipped(lines.some(line => line.scrollHeight > line.clientHeight + 1));
    });
    lines.forEach(line => observer.observe(line));
    return () => observer.disconnect();
  }, [expanded, hook, takeaway, hookLabel]);

  return <div className={styles.summary} data-expanded={expanded}>
    <h2 title={item.title}>{item.rank ? `#${item.rank} ` : ""}{item.title}</h2>
    <div>
      <div ref={body} id={id}>
        {hook && <p><b>{hookLabel}</b> {hook}</p>}
        {takeaway && <p><b>{t(["Adaptation", "可借鉴点"])}</b> {takeaway}</p>}
        {expanded && item.videoAnalysis && <dl className={styles.analysisDetails}>
          <dt>{t(["Shots", "镜头"])}</dt><dd>{t(item.videoAnalysis.shots)}</dd>
          <dt>{t(["Pacing", "节奏"])}</dt><dd>{t(item.videoAnalysis.pacing)}</dd>
          <dt>{t(["On-screen text", "画面字幕"])}</dt><dd>{t(item.videoAnalysis.captions)}</dd>
        </dl>}
      </div>
      {(expanded || clipped || item.videoAnalysis) && <button type="button" className={styles.loadMore}
        aria-controls={id} aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}>
        {expanded ? <>{t(["Show less", "收起"])} <ChevronUp size={13} aria-hidden="true" /></>
          : <>{t(["Load more", "加载更多"])} <ChevronDown size={13} aria-hidden="true" /></>}
      </button>}
    </div>
  </div>;
}

function SearchTrendRows({ items, t }: { items: TrendItem[]; t: Translate }) {
  return <ul className={styles.searchList}>
    {items.map(item => {
      const analysis = item.searchAnalysis;
      const market = item.market === "GB" ? "UK" : item.market;
      const volume = item.metrics.find(metric => metric.label === "volume")?.value;
      return <li className={styles.searchRow} key={item.id}>
        <div className={styles.searchTerm}>
          <h3>{item.title}</h3>
          <p><span>{market}</span>{volume && <strong>{t([`${volume} searches`, `${volume} 次搜索`])}</strong>}</p>
        </div>
        {analysis ? <dl className={styles.searchAnalysis}>
          <div><dt>{t(["Possible connection", "可能的联系"])}</dt><dd>{t(analysis.connection)}</dd></div>
          <div><dt>{t(["Use in a script", "剧本用处"])}</dt><dd>{t(analysis.scriptUse)}</dd></div>
        </dl> : <p className={styles.searchStatus}>{analysis === null
          ? t(["AI Video found no clear script connection.", "AI Video 暂未发现明确的剧本联系。"])
          : t(["Awaiting AI Video analysis.", "等待 AI Video 分析。"])}</p>}
      </li>;
    })}
  </ul>;
}

function SearchTrendList({ items, t }: { items: TrendItem[]; t: Translate }) {
  const relevant = items.filter(item => item.searchAnalysis);
  const other = items.filter(item => !item.searchAnalysis);

  return <section className={styles.searchResults} aria-label={t(["Google search trends", "Google 搜索趋势"])}>
    <h2>{t(["Trends with script ideas", "可用于剧本的趋势"])} <span>{relevant.length}</span></h2>
    {relevant.length > 0 ? <SearchTrendRows items={relevant} t={t} /> : (
      <p className={styles.searchStatus}>{t(["No script ideas available for this market yet.", "当前市场暂无可用的剧本分析。"])}</p>
    )}
    {other.length > 0 && <details className={styles.otherSearchTrends}>
      <summary>
        {t(["Other search trends", "其他搜索趋势"])} <span>{other.length}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <SearchTrendRows items={other} t={t} />
    </details>}
  </section>;
}

export function TrendReferences({ customer, t }: { customer: boolean; t: Translate }) {
  const cacheKey = `script-lab:biceek:trends:v2:${customer ? "public" : "internal"}`;
  const cached = useGeneratorStorage(cacheKey);
  let feed = emptyTrendFeed;
  if (cached) {
    try { feed = JSON.parse(cached) as TrendFeed; } catch {}
  }
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<TrendSource>("tiktok");
  const [market, setMarket] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(customer ? "/script-lab/trend-feed" : "/api/script-lab/trends", { signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const next = await response.json() as TrendFeed;
        writeGeneratorStorage(cacheKey, JSON.stringify(next));
      })
      .catch(() => undefined)
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [cacheKey, customer]);

  const instagramRange = feed.instagramHours === 720 ? t(["Last 30 days", "近 30 天"])
    : feed.instagramHours === 168 ? t(["Last 7 days", "近 7 天"]) : t(["Hashtags", "话题库"]);
  const labels = {
    tiktok: t(["TikTok · Last 7 days", "TikTok · 近 7 天"]),
    instagram: `Instagram · ${instagramRange}`,
    google: t(["Google Trends · Last 24h", "Google Trends · 近 24 小时"]),
  };
  const items = feed.items.filter(item => item.source === source && (!market || item.market === market));

  return <div className={styles.feed}>
    <nav className={`${candidateStyles.scriptBatchList} ${styles.sourceTabs}`} aria-label={t(["Source", "来源"])}>
        {trendSources.map(key => <button type="button" key={key} aria-pressed={source === key}
          title={key === "instagram" ? t(["Last 7 days first, expanding to 30 days when needed", "优先近 7 天，素材不足时扩大到近 30 天"]) : undefined}
          onClick={() => setSource(key)}><strong>{labels[key]}</strong></button>)}
    </nav>
    <Card className={`${candidateStyles.panel} ${candidateStyles.candidateTabPanel}`}>
      <div className={styles.selects}>
        <label>{t(["Market", "目标市场"])} <select value={market} onChange={event => setMarket(event.target.value)}>
          <option value="">{t(["All markets", "全部市场"])}</option>
          {trendMarkets.map(code => <option key={code} value={code}>{t(marketNames[code])} ({code === "GB" ? "UK" : code})</option>)}
        </select></label>
      </div>
    {!items.length && <p className={styles.empty} role="status">{loading ? t(["Loading references…", "正在读取创意素材…"]) :
      source === "instagram" && !feed.instagramHours ? t(["No verified Instagram references yet. The feed checks 7 days first, then up to 30 days.", "暂时没有已核实的 Instagram 素材。话题库优先取近 7 天，素材不足时扩大到近 30 天。"])
        : t(["No references match these filters.", "没有符合当前筛选的素材。"])}</p>}
    {source === "google" ? <SearchTrendList items={items} t={t} /> : <div className={styles.grid}>
      {items.map(item => {
        const metrics = item.kind === "ad" ? ["likes", "ctr", "budget"].map(label => ({
          label, value: item.metrics.find(metric => metric.label === label)?.value ?? t(["Pending", "待核实"]),
        })) : item.kind !== "search" && item.publishedAt && item.metrics.length < 3
          ? [...item.metrics, { label: "date", value: item.publishedAt.slice(0, 10) }] : item.metrics;
        return <Card key={item.id} className={styles.card}>
          <div className={styles.media}>
            <Preview item={item} customer={customer} t={t} />
            <div className={styles.badges}><span>{names[item.source]}{item.market ? ` · ${item.market === "GB" ? "UK" : item.market}` : ""}</span><span title={item.hashtag}>{t([
              item.coverageHours === 24 ? "Last 24h" : `Last ${item.coverageHours / 24} days`,
              item.coverageHours === 24 ? "近 24 小时" : `近 ${item.coverageHours / 24} 天`,
            ])}</span></div>
          </div>
          <dl className={styles.metrics}>
            {metrics.slice(0, 3).map(metric => <div key={metric.label}>
              <dt>{t(metricNames[metric.label] ?? ["Published", "发布日期"])}</dt><dd>{metric.value}</dd>
            </div>)}
          </dl>
          <CreativeSummary item={item} t={t} />
          <div className={styles.actions}>
            {item.kind !== "ad" && <a href={item.url} target="_blank" rel="noreferrer">{t(["View post", "查看原帖"])} <ExternalLink size={13} /></a>}
            {item.kind === "ad" && !item.videoAnalysis && <span>{item.video || item.mediaId
              ? t(["Video analysis pending", "视频分析待生成"])
              : t(["Awaiting verified video", "视频待核实"])}</span>}
          </div>
        </Card>;
      })}
    </div>}
    </Card>
  </div>;
}
