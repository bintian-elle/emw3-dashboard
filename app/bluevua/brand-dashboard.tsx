"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, FlaskConical, Mail, MousePointer2 } from "lucide-react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import styles from "../workspace-entry.module.css";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

const dashboards: { href: string; icon: LucideIcon; title: string; zhTitle: string }[] = [
  { href: "/bluevua/google", icon: ChartNoAxesCombined, title: "Google Ads", zhTitle: "Google 广告" },
  { href: "/bluevua/edm", icon: Mail, title: "EDM", zhTitle: "邮件营销" },
  { href: "/bluevua/tracking", icon: MousePointer2, title: "Website Tracking", zhTitle: "网站追踪" },
  { href: "/bluevua/testing", icon: FlaskConical, title: "Content Testing", zhTitle: "内容测试" },
];

export default function BluevuaProject({ metrics }: { metrics: Record<string, ReactNode> }) {
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  return <main className={styles.page}><div className={styles.container}>
    <div className={styles.topline}>
      <Link href="/" className={styles.back}><ArrowLeft size={15} aria-hidden="true" />{t("All workspaces", "所有工作区")}</Link>
    </div>
    <div className={styles.projectHeading}><Image src="/brand/bluevua-logo.svg" alt="" width={48} height={48} className={styles.projectLogo} priority/><h1 className={styles.heading}>Bluevua</h1></div>
    <section className={styles.section} aria-labelledby="dashboard-heading"><h2 id="dashboard-heading" className={styles.sectionTitle}>{t("Dashboards", "仪表盘")}</h2><div className={styles.grid}>
      {dashboards.map(({ href, icon: Icon, title, zhTitle }) => <Link href={href} className={styles.card} key={href}><div className={styles.cardTop}><span className={styles.icon}><Icon size={18}/></span><ArrowRight size={16}/></div><h3 className={styles.cardTitle}>{title === "Google Ads" || title === "EDM" ? title : t(title, zhTitle)}</h3>{metrics[href]}</Link>)}
    </div></section>
  </div></main>;
}
