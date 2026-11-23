"use client";

import { useState } from "react";
import { Copy, Download, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { LocalizedText } from "@/lib/script-lab-project";
import {
  buildRoundOneKeywords, excludedRoundOneAudiences, roundOneAudiences,
  roundOneBriefFields, roundOneControls, type RoundOneAudienceCode, type RoundOneBrief,
} from "@/lib/script-lab-round-one";
import styles from "./workbench.module.css";

type Translate = (text: LocalizedText) => string;

export function RoundOnePanel({ t, generate }: { t: Translate; generate: (audiences: RoundOneAudienceCode[]) => void }) {
  const [audiences, setAudiences] = useState<RoundOneAudienceCode[]>(["COMM"]);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const controls = roundOneControls;

  return (
    <Card className={styles.panel}>
      <h2>{t(["Round 1 · Audience test", "第一轮 · 人群测试"])}</h2>
      <div className={styles.metadata} aria-label={t(["Locked variables", "已锁定变量"])}>
        <LockKeyhole size={15} aria-hidden="true" />
        {[controls.market, controls.funnel, controls.pain].map(({ code, label }) => (
          <Badge key={code} variant="secondary">{code} · {t(label)}</Badge>
        ))}
      </div>
      <fieldset className={styles.audiencePicker}>
        <legend>{t(["Select audiences", "勾选人群"])}</legend>
        <p className={styles.muted}>{t(["The commuter baseline is included. Only the audience can vary.", "通勤者作为基准保留，本轮只改变人群。"])}</p>
        <div className={styles.audienceOptions}>
          {roundOneAudiences.map(({ code, label }) => (
            <label key={code}>
              <input type="checkbox" checked={audiences.includes(code)} disabled={code === "COMM"} onChange={(event) => {
                const checked = event.target.checked;
                setAudiences((current) => checked ? [...current, code] : current.filter((item) => item !== code));
                setGeneratedCount(null);
              }} />
              <span>{code} · {t(label)}</span>
            </label>
          ))}
        </div>
        <details className={styles.excluded}>
          <summary>{t(["3 audiences disabled in the customer rules", "客户规则禁用 3 个人群"])}</summary>
          <ul>{excludedRoundOneAudiences.map(({ code, label }) => <li key={code}>{code} · {t(label)}</li>)}</ul>
        </details>
      </fieldset>
      <button className={styles.primary} type="button" onClick={() => { generate(audiences); setGeneratedCount(audiences.length); }}>
        {t(["Pre-generate briefs", "预生成 Brief"])}
      </button>
      <p className={styles.muted} role="status">{generatedCount === null
        ? t([`${audiences.length} combinations selected`, `当前选择 ${audiences.length} 种组合`])
        : t([`${generatedCount} combinations passed the first-round rules.`, `${generatedCount} 种组合已通过第一轮规则校验。`])}</p>
    </Card>
  );
}

export function BriefDetails({ brief, t }: { brief: RoundOneBrief; t: Translate }) {
  return (
    <dl className={styles.briefFields}>
      {roundOneBriefFields(brief).map(({ label, value }) => (
        <div key={label[0]}><dt>{t(label)}</dt><dd>{t(value)}</dd></div>
      ))}
    </dl>
  );
}

export function VideoKeywords({ selected, order, zh, batchName, t }: {
  selected: RoundOneBrief[];
  order: RoundOneBrief[];
  zh: boolean;
  batchName: string;
  t: Translate;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const markdown = buildRoundOneKeywords(selected, order, zh);

  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `Findhoo200_Video_Keywords_${batchName.replace(" ", "-")}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <button className={styles.secondary} type="button" disabled={!selected.length} aria-expanded={expanded && selected.length > 0} onClick={() => setExpanded(!expanded)}>
        {t(["Extract Video Keywords", "提取 Video 关键词"])} ({selected.length})
      </button>
      {expanded && selected.length > 0 && (
        <div className={styles.keywords}>
          <button className={styles.secondary} type="button" onClick={download}><Download size={16} aria-hidden="true" />{t(["Download Markdown", "下载 Markdown"])}</button>
          <button className={styles.secondary} type="button" onClick={async () => {
            try {
              await navigator.clipboard.writeText(markdown);
              setCopyStatus(t(["Copied", "已复制"]));
            } catch {
              setCopyStatus(t(["Select and copy the Markdown below.", "请选中下方 Markdown 文本并复制。"]));
            }
          }}><Copy size={16} aria-hidden="true" />{t(["Copy Markdown", "复制 Markdown"])}</button>
          <p className="sr-only" role="status">{copyStatus}</p>
          <pre>{markdown}</pre>
        </div>
      )}
    </>
  );
}
