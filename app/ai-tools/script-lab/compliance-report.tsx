"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { sameComplianceTarget, type ComplianceReport, type ComplianceTarget } from "@/lib/script-lab-compliance";
import type { LocalizedText } from "@/lib/script-lab-project";
import styles from "./workbench.module.css";

const labels = {
  passed: { variant: "success", text: ["Passed", "通过"] },
  failed: { variant: "danger", text: ["Needs correction", "需修正"] },
  needs_verification: { variant: "warning", text: ["Needs verification", "待核实"] },
  not_applicable: { variant: "secondary", text: ["Not applicable", "不适用"] },
} as const;

export function ComplianceReportView({ endpoint, target, t }: {
  endpoint: string;
  target?: ComplianceTarget;
  t: (text: LocalizedText) => string;
}) {
  const [report, setReport] = useState<ComplianceReport>();
  const query = target ? new URLSearchParams({ view: "compliance", ...target }).toString() : "";
  const completed = report && target && sameComplianceTarget(report, target) ? report : undefined;

  useEffect(() => {
    if (!query || completed || process.env.NODE_ENV !== "development") return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const params = new URLSearchParams(query);
    async function poll() {
      try {
        const response = await fetch(`${endpoint}?${query}`, { signal: controller.signal, cache: "no-store" });
        if (response.ok) {
          const { report } = await response.json() as { report: ComplianceReport | null };
          if (report && report.status === "completed"
            && report.batch_id === params.get("batch_id") && report.artifact_kind === params.get("artifact_kind")
            && report.artifact_id === params.get("artifact_id") && report.artifact_revision === params.get("artifact_revision")) {
            if (!controller.signal.aborted) setReport(report);
            return;
          }
        }
      } catch {
        // A temporary connection failure can recover on the next check.
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [completed, endpoint, query]);

  if (process.env.NODE_ENV !== "development") return null;
  if (!completed) return <p role="status" className={styles.muted}>{t(["Self-check in progress", "自检中"])}</p>;

  return <CompletedComplianceReport report={completed} t={t} />;
}

export function CompletedComplianceReport({ report, additional = [], t }: {
  report: ComplianceReport; additional?: ComplianceReport[]; t: (text: LocalizedText) => string;
}) {
  const reports = [report, ...additional];
  const rows = reports.flatMap(item => item.checks.map(check => ({ report: item, check })));
  const counts = rows.reduce((result, { check }) => {
    result[check.status] += 1;
    return result;
  }, { passed: 0, failed: 0, needs_verification: 0, not_applicable: 0 });

  function checks(items: typeof rows, start: number) {
    return <ol className={styles.complianceChecks} start={start}>
      {items.map(({ report: item, check }) => {
        const label = labels[check.status];
        const position = check.shot_no === null ? check.field_path : t([`Shot ${check.shot_no}`, `第 ${check.shot_no} 镜`]);
        return <li key={`${item.artifact_kind}/${item.artifact_id}/${check.check_id}`}>
          <Badge variant={label.variant}>{t(label.text)}</Badge>{" "}
          {reports.length > 1 && <span className={styles.muted}>{item.artifact_kind === "script"
            ? t(["Script", "剧本"]) : t(["Storyboard", "分镜"])} · </span>}
          {position && <strong>{position} · </strong>}{check.note}
          {check.rule_id && <div className={styles.muted}>{t(["Rule", "规则"])} {check.rule_id}</div>}
          {check.evidence_refs.length > 0 && <div className={styles.muted}>{t(["Evidence", "证据"])} {check.evidence_refs.join(t([", ", "、"]))}</div>}
        </li>;
      })}
    </ol>;
  }

  return <section className={styles.complianceReport}>
    <div className={styles.panelHeader}>
      <h3>{t(["Compliance self-check", "合规自检"])}</h3>
      <div className={styles.complianceCounts}>
        {Object.entries(labels).map(([status, label]) => {
          const count = counts[status as keyof typeof counts];
          if (status === "not_applicable" && count === 0) return null;
          return <Badge key={status} variant={label.variant}>{t(label.text)} {count}</Badge>;
        })}
      </div>
    </div>
    {checks(rows.slice(0, 3), 1)}
    {rows.length > 3 && <details className={styles.complianceMore}>
      <summary>{t([`Show ${rows.length - 3} more checks`, `展开其余 ${rows.length - 3} 条`])}<ChevronDown size={15} aria-hidden="true" /></summary>
      {checks(rows.slice(3), 4)}
    </details>}
  </section>;
}
