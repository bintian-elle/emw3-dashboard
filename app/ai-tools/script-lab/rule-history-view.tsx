"use client";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ruleDimensions, ruleFieldDefinitions, ruleStatuses, type RuleHistoryEntry, type RuleSnapshot } from "@/lib/script-lab-rules";
import styles from "./rules.module.css";

type Props = {
  customer: boolean;
  page: number;
  version: string | null;
  entries: RuleHistoryEntry[] | null;
  hasNextPage: boolean;
  needsLogin: boolean;
};

export function RuleHistoryView({ customer, page, version, entries, hasNextPage, needsLogin }: Props) {
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const home = customer ? "/script-lab" : "/ai-tools/script-lab";
  const history = `${home}/rule-history`;
  const time = new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", {
    timeZone: "America/Chicago", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  });
  const actions = { create: t("Created", "新增"), update: t("Updated", "编辑"), delete: t("Deleted", "删除") };

  function snapshot(title: string, rule: RuleSnapshot | null) {
    if (rule && "kind" in rule) return <div><h3>{title}</h3><dl>
      <dt>{t("Dimension and code", "维度与编码")}</dt><dd>{rule.code} · {rule.label}</dd>
    </dl></div>;
    const field = rule && ruleDimensions.find(item => item.code === rule.dimension);
    return <div>
      <h3>{title}</h3>
      {rule ? <dl>
        <dt>{t("Dimension and code", "维度与编码")}</dt><dd>{field ? field.label[language === "zh" ? 1 : 0] : rule.dimension} · {rule.code}</dd>
        <dt>{t("Name", "名称")}</dt><dd>{rule.label}</dd>
        <dt>{t("Status", "状态")}</dt><dd>{ruleStatuses.find(item => item.id === rule.status)?.label[language === "zh" ? 1 : 0] ?? "—"}</dd>
        {rule.default_selected && <><dt>{t("Selected by default", "默认勾选")}</dt><dd>{t("Yes", "是")}</dd></>}
        {ruleFieldDefinitions(rule.dimension).map(({ key, label }) => rule.fields?.[key] && <div key={key}>
          <dt>{label[language === "zh" ? 1 : 0]}</dt><dd>{rule.fields[key]}</dd>
        </div>)}
        {rule.notes && <><dt>{t("Notes", "备注")}</dt><dd>{rule.notes}</dd></>}
      </dl> : <p className={styles.historyMeta}>—</p>}
    </div>;
  }

  return <div className={styles.historyPage}>
    <Link className={styles.secondary} href={`${home}/rule-library`}><ArrowLeft size={16} aria-hidden="true" />{t("Rule library management", "规则库管理")}</Link>
    <h1>{t("Change history", "修改历史")}</h1>
    {version && <Badge variant="secondary">{t("Current rule library version", "当前规则库版本")} {version}</Badge>}
    {needsLogin ? <Card className={styles.historyItem}>
      <p className={styles.historyMeta}>{t("Sign in using the top bar to view your changes.", "请在顶栏登录后查看当前账号的修改记录。")}</p>
    </Card> : entries === null ? <p role="alert">{t("History is temporarily unavailable.", "修改历史暂时无法读取。")}</p> : <>
      <p className={styles.historyMeta}>{customer ? t("Changes made by your account", "当前账号的修改记录") : t("Biceek rule changes", "Biceek 规则修改记录")}</p>
      {entries.length ? <ul className={styles.historyList}>
        {entries.map(entry => {
          const rule = entry.after_rule ?? entry.before_rule;
          return <li key={entry.id}><Card className={styles.historyItem}>
            <details>
              <summary><Badge variant="secondary">{actions[entry.action]}</Badge> {rule?.code} · {rule?.label}</summary>
              <p className={styles.historyMeta}><time dateTime={new Date(entry.changed_at).toISOString()}>{time.format(new Date(entry.changed_at))}</time> · {entry.actor_email}</p>
              <div className={styles.snapshots}>{snapshot(t("Before", "修改前"), entry.before_rule)}{snapshot(t("After", "修改后"), entry.after_rule)}</div>
            </details>
          </Card></li>;
        })}
      </ul> : <p className={styles.historyMeta}>{t("No changes recorded on this page.", "此页暂无修改记录。")}</p>}
      {(page > 1 || hasNextPage) && <nav className={styles.toolbar} aria-label={t("History pages", "历史分页")}>
        {page > 1 && <Link className={styles.secondary} href={`${history}?page=${page - 1}`}><ChevronLeft size={16} aria-hidden="true" />{t("Previous", "上一页")}</Link>}
        {hasNextPage && <Link className={styles.secondary} href={`${history}?page=${page + 1}`}>{t("Next", "下一页")}<ChevronRight size={16} aria-hidden="true" /></Link>}
      </nav>}
    </>}
  </div>;
}
