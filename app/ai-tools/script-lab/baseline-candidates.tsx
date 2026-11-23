"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { isBaselineCode, type BaselineScript } from "@/lib/script-lab-baselines";
import type { LocalizedText } from "@/lib/script-lab-project";
import { CascadeConnections, type CascadeSegment } from "./cascade-connections";
import { ScriptDetailSections } from "./script-detail-sections";
import { readGeneratorStorage, useGeneratorStorage, writeGeneratorStorage } from "./use-generator-selection";
import styles from "./workbench.module.css";

type Translate = (text: LocalizedText) => string;

function readSnapshot(raw: string | null): { version: string; scripts: BaselineScript[] } | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value?.version === "string" && Array.isArray(value.scripts) ? value : null;
  } catch {
    return null;
  }
}

const baselineConnections: CascadeSegment[] = [
  { from: '[data-connection="batch"][aria-current]', to: '[data-connection="script-list"]', toOffset: 44 },
  { from: '[data-connection="script"] a[aria-current]', to: '[data-connection="script-detail"]', toOffset: 44 },
];

function BaselineDetails({ script, t }: { script: BaselineScript; t: Translate }) {
  return <ScriptDetailSections t={t}
    introduction={<p className={styles.muted}>{script.synopsis}</p>}
    combination={<details>
      <summary>{t(["Source combination", "查看原始组合"])}</summary>
      <p className={styles.baselineText}>{script.source_combination}</p>
    </details>}
    opening={<p className={styles.baselineText}>{script.opening_hook}</p>}
    body={<ol className={styles.baselineBody}>
      {script.body.map((beat, index) => <li key={index}>
        <strong>{beat.time}</strong>
        <p>{beat.visual}</p>
        {beat.dialogue && <p className={styles.baselineText}>{beat.dialogue}</p>}
        {beat.subtitle && <p className={`${styles.muted} ${styles.baselineText}`}>
          {t(["On-screen text", "字幕"])} · {beat.subtitle}
        </p>}
      </li>)}
    </ol>}
    storyboardHeading={["Storyboard table", "分镜表"]}
    storyboard={<>
      <div className={styles.tableWrap} tabIndex={0} role="region" aria-label={t(["Storyboard table", "分镜表"])}>
        <table className={`${styles.table} ${styles.fullStoryboardTable} ${styles.baselineText}`}>
          <thead><tr>{script.storyboard.columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead>
          <tbody>{script.storyboard.rows.map((row, index) => <tr key={index}>
            {row.map((cell, column) => <td key={column}>{cell}</td>)}
          </tr>)}</tbody>
        </table>
      </div>
      {script.storyboard.notes && <p className={`${styles.muted} ${styles.baselineText}`}>{script.storyboard.notes}</p>}
    </>}
    rationale={<p className={styles.baselineText}>{script.rationale}</p>}
    compliance={<p className={styles.baselineText}>{script.compliance}</p>}
    footer={<a className={styles.back} href={script.source_url} target="_blank" rel="noreferrer">{t(["Open original reference", "查看原始参考"])}</a>}
  />;
}

export function BaselineCandidates({ requestedCode, path, customer, container, t }: {
  requestedCode: string | null;
  path: string;
  customer: boolean;
  container: RefObject<HTMLDivElement | null>;
  t: Translate;
}) {
  const code = requestedCode && isBaselineCode(requestedCode) ? requestedCode : "#01";
  const endpoint = customer ? "/script-lab/baselines" : "/ai-tools/script-lab/baselines";
  const cacheKey = `emw3:script-lab:biceek:baselines:v1:${customer ? "public" : "internal"}`;
  const saved = useGeneratorStorage(cacheKey);
  const loaded = useMemo(() => readSnapshot(saved), [saved]);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function sync() {
      const cached = readSnapshot(readGeneratorStorage(cacheKey));
      async function fetchView(view: "version" | "snapshot") {
        const response = await fetch(`${endpoint}?view=${view}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Could not load baselines");
        return response;
      }
      if (cached) {
        const { version } = await (await fetchView("version")).json() as { version: string };
        if (version === cached.version) return;
      }
      const response = await fetchView("snapshot");
      const snapshot = await response.text();
      if (!readSnapshot(snapshot)) throw new Error("Invalid baseline snapshot");
      if (!controller.signal.aborted) writeGeneratorStorage(cacheKey, snapshot);
    }
    void sync().catch(() => {
      if (!controller.signal.aborted && !readSnapshot(readGeneratorStorage(cacheKey))) setFailed(true);
    });
    return () => controller.abort();
  }, [cacheKey, endpoint, retry]);

  const scripts = loaded?.scripts ?? [];
  const active = scripts.find(script => script.code === code);
  return <>
    <CascadeConnections container={container} selection={`baseline/${code}/${scripts.length ? "ready" : "pending"}`} segments={baselineConnections} />
    <Card className={styles.panel} data-connection="script-list">
      <h2>{t(["Baseline scripts", "基准剧本"])}</h2>
      {!scripts.length && !failed && <p role="status" className={styles.muted}>{t(["Loading baseline scripts…", "正在读取基准剧本…"])}</p>}
      <nav aria-label={t(["Baseline script list", "基准剧本名单"])} className={styles.baselineList}>
        <ul>
          {scripts.map(item => <li key={item.code} data-connection="script">
            <Link href={`${path}?${new URLSearchParams({ baseline: item.code })}`} scroll={false} aria-current={item.code === code ? "true" : undefined}
              onNavigate={() => {
                if (window.matchMedia("(max-width: 900px)").matches) document.getElementById("script-detail")?.scrollIntoView();
              }}>
              <strong>{item.code} {item.title}</strong>
            </Link>
          </li>)}
        </ul>
      </nav>
    </Card>
    <section id="script-detail" className={styles.stack} aria-label={t(["Script details", "剧本详情"])} data-connection="script-detail">
      <Card className={`${styles.panel} ${styles.baselineDetail}`}>
        <h2>{code} {active?.title}</h2>
        {active ? <>
          <p className={styles.muted}><code>{active.source_script_id}</code></p>
          <BaselineDetails script={active} t={t} />
        </> : failed ? <>
          <p role="alert" className={styles.muted}>{t(["Could not load this baseline.", "无法读取这个基准剧本。"])}</p>
          <button type="button" className={styles.secondary} onClick={() => { setFailed(false); setRetry(value => value + 1); }}>
            {t(["Retry", "重试"])}
          </button>
        </> : loaded
          ? <p className={styles.muted}>{t(["This baseline is unavailable.", "这个基准剧本不可用。"])}</p>
          : <p role="status" className={styles.muted}>{t(["Loading script details…", "正在读取剧本详情…"])}</p>}
      </Card>
    </section>
  </>;
}
