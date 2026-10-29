"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, FlaskConical, Mail, MousePointer2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "../workspace-entry.module.css";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

const dashboards: { href: string; icon: LucideIcon; title: string; zhTitle: string; description: string; zhDescription: string }[] = [
  { href: "/bluevua/google", icon: ChartNoAxesCombined, title: "Google Ads", zhTitle: "Google 广告", description: "Account performance, search demand, products and creative reporting.", zhDescription: "查看账户表现、搜索需求、产品和素材报告。" },
  { href: "/bluevua/edm", icon: Mail, title: "EDM", zhTitle: "邮件营销", description: "Email marketing and campaign performance.", zhDescription: "查看邮件营销和活动表现。" },
  { href: "/bluevua/tracking", icon: MousePointer2, title: "Website Tracking", zhTitle: "网站追踪", description: "Website engagement, actions and purchase sources.", zhDescription: "查看网站互动、用户行为和购买来源。" },
  { href: "/bluevua/testing", icon: FlaskConical, title: "Content Testing", zhTitle: "内容测试", description: "Monitor creative tests and compare performance across channels.", zhDescription: "跟踪素材测试并比较各渠道的表现。" },
];

export default function BluevuaProject() {
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  return <main className={styles.page}><div className={styles.container}>
    <div className={styles.topline}><p className={styles.eyebrow}>{t("Project", "项目")}</p><Link href="/" className={styles.back}><ArrowLeft size={15}/> {t("All workspaces", "所有工作区")}</Link></div>
    <div className={styles.projectHeading}><Image src="/brand/bluevua-logo.svg" alt="" width={48} height={48} className={styles.projectLogo} priority/><h1 className={styles.heading}>Bluevua</h1></div><p className={styles.description}>{t("Marketing performance and website analytics.", "营销表现与网站分析。")}</p>
    <section className={styles.section} aria-labelledby="dashboard-heading"><h2 id="dashboard-heading" className={styles.sectionTitle}>{t("Dashboards", "仪表盘")}</h2><div className={styles.grid}>
      {dashboards.map(({ href, icon: Icon, title, zhTitle, description, zhDescription }) => <Link href={href} className={styles.card} key={href}><div className={styles.cardTop}><span className={styles.icon}><Icon size={18}/></span><ArrowRight size={16}/></div><h3 className={styles.cardTitle}>{title === "Google Ads" || title === "EDM" ? title : t(title, zhTitle)}</h3><p className={styles.cardText}>{t(description, zhDescription)}</p><span className={styles.cardLink}>{t("Open dashboard", "打开仪表盘")} <ArrowRight size={14}/></span></Link>)}
    </div></section>
  </div></main>;
}
