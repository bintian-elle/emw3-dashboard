"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, LayoutDashboard } from "lucide-react";
import styles from "../workspace-entry.module.css";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

export default function AiTools() {
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  return <main className={styles.page}><div className={styles.container}>
    <div className={styles.topline}><p className={styles.eyebrow}>{t("Workspace", "工作区")}</p><Link href="/" className={styles.back}><ArrowLeft size={15}/> {t("All workspaces", "所有工作区")}</Link></div>
    <h1 className={styles.heading}>{t("AI Tools", "AI 工具")}</h1><p className={styles.description}>{t("Build marketing dashboards and plan video scripts.", "创建营销仪表盘，规划视频脚本。")}</p>
    <section className={styles.section} aria-labelledby="tools-heading"><h2 id="tools-heading" className={styles.sectionTitle}>{t("Tools", "工具")}</h2><div className={styles.grid}>
      <Link href="/ai-tools/dashboard-builder" className={styles.card}><div className={styles.cardTop}><span className={styles.icon}><LayoutDashboard size={18}/></span><ArrowRight size={16}/></div><h3 className={styles.cardTitle}>{t("Dashboard Builder", "仪表盘生成器")}</h3><p className={styles.cardText}>{t("Turn your marketing data into metric cards, trends and tables, then refine them through conversation.", "将营销数据转化为指标卡片、趋势图和表格，并通过对话持续调整。")}</p><span className={styles.cardLink}>{t("Open Dashboard Builder", "打开仪表盘生成器")} <ArrowRight size={14}/></span></Link>
      <Link href="/ai-tools/script-lab" className={styles.card}>
        <div className={styles.cardTop}><span className={styles.icon}><FileText size={18} aria-hidden="true" /></span><ArrowRight size={16} aria-hidden="true" /></div>
        <h3 className={styles.cardTitle}>AI Script Lab</h3>
        <p className={styles.cardText}>{t("Review selling points and matching rules for video scripts, starting with Biceek.", "从 Biceek 开始，查看视频脚本的卖点和匹配规则。")}</p>
        <span className={styles.cardLink}>{t("Open AI Script Lab", "打开 AI Script Lab")} <ArrowRight size={14} aria-hidden="true" /></span>
      </Link>
    </div></section>
  </div></main>;
}
