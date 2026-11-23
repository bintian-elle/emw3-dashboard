"use client";

import { useState } from "react";
import { Square } from "lucide-react";
import type { LocalizedText } from "@/lib/script-lab-project";
import type { VideoJob } from "@/lib/script-lab-video-jobs";
import { Badge } from "@/components/ui/badge";
import styles from "./script-generator.module.css";
import rulesStyles from "./rules.module.css";

const stages: Record<string, LocalizedText> = {
  queued: ["Queued", "排队中"],
  validating: ["Validating rules", "核对组合与规则"],
  researching: ["Fetching references", "读取参考资料"],
  generating: ["Generating", "AI 正在生成"],
  storyboarding: ["Generating storyboard", "正在生成分镜"],
  checking_storyboard: ["Checking storyboard compliance", "分镜合规自检中"],
  checking: ["Checking compliance", "合规自检中"],
  revising: ["Revising after validation", "按校验结果重写"],
  item_rejected: ["Combination skipped", "组合已跳过"],
  item_done: ["Combination processed", "组合处理完成"],
  saving: ["Saving", "保存结果中"],
  completed: ["Completed", "已完成"],
  failed: ["Failed", "生成失败"],
  cancelled: ["Stopped", "已停止"],
};

const reasons: Record<string, LocalizedText> = {
  single_variable_constraint: ["Changes exceed the selected round’s allowed dimensions.", "相对基准的改动超出本轮允许的维度或数量。"],
  pain_matching: ["Selling point, evidence, hook or scene does not match the pain point.", "主卖点、证据、Hook 或场景与痛点规则不匹配。"],
  prohibited_terms: ["Draft contains prohibited terms.", "草稿命中禁用词。"],
  invalid_variable: ["A selected variable is unavailable under the current rules.", "所选变量不符合当前规则。"],
  second_wave_required: ["Enable the second rollout wave for this market or language.", "该市场或语言需要开启第二轮放大。"],
  approval_changed: ["The source script’s approval changed.", "来源剧本的审核状态已变化。"],
  shot_timing: ["Shot timing did not pass validation.", "分镜时间轴未通过校验。"],
  self_check_unavailable: ["The compliance report did not complete.", "合规自检报告未完成。"],
};

export function videoTime(value: string, t: (label: LocalizedText) => string) {
  return new Intl.DateTimeFormat(t(["en-US", "zh-CN"]), { dateStyle: "short", timeStyle: "medium", timeZone: "America/Chicago" }).format(new Date(value));
}

export function VideoJobProgress({ job: currentJob, stopEndpoint, t }: {
  job: VideoJob; stopEndpoint?: string; t: (label: LocalizedText) => string;
}) {
  const [stoppedJob, setStoppedJob] = useState<VideoJob>();
  const [stopping, setStopping] = useState(false);
  const [stopError, setStopError] = useState<LocalizedText>();
  const job = stoppedJob ?? currentJob;
  const canStop = stopEndpoint && job.can_cancel && (job.status === "queued" || job.status === "running");

  async function stop() {
    if (!stopEndpoint || stopping) return;
    setStopping(true);
    setStopError(undefined);
    try {
      const response = await fetch(stopEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", job_id: job.id }),
      });
      if (response.status === 409) {
        setStopError(["This job can no longer be stopped.", "此任务已无法停止。"]);
        return;
      }
      if (!response.ok) throw new Error();
      const result = await response.json() as { job: VideoJob };
      setStoppedJob(result.job);
    } catch {
      setStopError(["Could not stop generation. Try again.", "无法停止生成，请重试。"]);
    } finally {
      setStopping(false);
    }
  }

  const status = job.status === "completed" && job.generated_count < job.total
    ? ["Partially completed", "部分完成"] as const
    : stages[job.status === "running" ? job.stage : job.status] ?? stages.generating;
  return <div className={styles.jobProgress}>
    <div className={styles.jobProgressHeader}>
      <Badge variant={job.status === "failed" ? "danger" : job.status === "completed" ? "success" : "secondary"}>
        {t(status)}{job.status === "queued" && job.queue_position > 0 && ` · #${job.queue_position}`}
      </Badge>
      <span>{job.status === "completed" ? job.generated_count : job.processed}/{job.total}</span>
    </div>
    {job.status === "running" && <progress value={job.processed} max={job.total} aria-label={t(["Generation progress", "生成进度"])} />}
    {canStop && <div className={styles.actions}>
      <button type="button" className={rulesStyles.danger} disabled={stopping} onClick={() => void stop()}>
        <Square size={14} aria-hidden="true" />
        {stopping ? t(["Stopping…", "正在停止…"]) : t(["Stop generation", "停止生成"])}
      </button>
    </div>}
    {stopError && <p className={rulesStyles.error} role="alert">{t(stopError)}</p>}
    {job.status === "failed" && <p>{job.error_code === "no_usable_output"
      ? t(["No combination produced a usable result.", "本批没有通过校验并完成生成的组合。"])
      : t(["The generation did not finish. You can submit it again.", "生成未完成，可以重新提交。"])}</p>}
    {!!job.issues?.length && <ul className={styles.jobIssues}>
      {job.issues.map(issue => <li key={issue.code}>
        <strong>{issue.count} {t(["items", "条"])}</strong>{": "}
        {t(reasons[issue.code] ?? ["Processing error.", "处理失败。"])}
      </li>)}
    </ul>}
    {!!job.recent_events?.length && <div className={styles.jobActivity}>
      <strong>{t(["Agent activity", "Agent 处理记录"])}</strong>
      <ol role="log" aria-label={t(["Recent processing steps", "最近处理步骤"])} aria-live="off">
        {job.recent_events.map((event, index) => {
          const itemNumber = event.item_no ?? Math.min(event.processed + 1, job.total);
          return <li key={`${event.at}-${index}`}>
          <time dateTime={event.at}>{videoTime(event.at, t)}</time>
          <div>
            {["validating","researching","generating","checking","storyboarding","checking_storyboard","revising","item_rejected","item_done"].includes(event.stage)
              && <span className={styles.muted}>{t([`Item ${itemNumber}/${job.total}`, `第 ${itemNumber}/${job.total} 条`])} · </span>}
            {t(stages[event.stage] ?? ["Processing", "正在处理"])}
            {event.reason && <p>{t(reasons[event.reason] ?? ["Processing error.", "处理失败。"])}</p>}
          </div>
        </li>;
        })}
      </ol>
    </div>}
    <dl>
      <div><dt>{t(["Submitted", "提交"])}</dt><dd>{videoTime(job.submitted_at, t)}</dd></div>
      {job.started_at && <div><dt>{t(["Started", "开始"])}</dt><dd>{videoTime(job.started_at, t)}</dd></div>}
      {job.finished_at && <div><dt>{t(["Finished", "结束"])}</dt><dd>{videoTime(job.finished_at, t)}</dd></div>}
    </dl>
  </div>;
}
