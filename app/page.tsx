"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, FlaskConical, LayoutDashboard, Mail, MousePointer2, Sparkles } from "lucide-react";
import styles from "./home.module.css";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

const dashboards = [
  { name: "Google Ads", zhName: "Google 广告", href: "/bluevua/google", icon: ChartNoAxesCombined, color: "google" },
  { name: "EDM", zhName: "邮件营销", href: "/bluevua/edm", icon: Mail, color: "edm" },
  { name: "Website Tracking", zhName: "网站追踪", href: "/bluevua/tracking", icon: MousePointer2, color: "tracking" },
  { name: "Content Testing", zhName: "内容测试", href: "/bluevua/testing", icon: FlaskConical, color: "testing" },
] as const;

export default function Home() {
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  return <main className={styles.home}>
    <section className={styles.workspaces} aria-labelledby="workspaces-heading">
      <div className={styles.column}>
        <h1 id="workspaces-heading" className={styles.heading}>{t("Brand Dashboards", "品牌仪表盘")}</h1>
        <p className={styles.intro}>{t("Access brand workspaces to explore marketing data and insights across channels in one place.", "进入品牌工作区，在一处查看各渠道的营销数据与洞察。")}</p>
        <div className={styles.workspaceList}>
          <article className={styles.workspace}>
            <Link href="/bluevua" className={styles.workspaceLink} aria-label={t("Open Bluevua workspace", "打开 Bluevua 工作区")}>
              <Image src="/brand/bluevua-logo.svg" alt="" width={48} height={48} className={styles.brandLogo}/>
              <span className={styles.brandName}>Bluevua</span><span className={styles.circleArrow}><ArrowRight size={18}/></span>
            </Link>
            <div className={styles.dashboardGrid}>
              {dashboards.map(({name, zhName, href, icon: Icon, color}) => <Link key={href} href={href} className={styles.dashboard}>
                <span className={`${styles.dashboardIcon} ${styles[color]}`}>{color === "google" ? <Image src="/brand/channels/google-ads.svg" width={30} height={30} alt=""/> : <Icon size={23}/>}</span>
                <span className={styles.dashboardTitle}>{name === "Google Ads" || name === "EDM" ? name : t(name, zhName)}</span>
                <span className={styles.smallArrow}><ArrowRight size={16}/></span>
              </Link>)}
            </div>
          </article>
          <article className={styles.workspace} aria-labelledby="biceek-heading">
            <h2 id="biceek-heading">
              <Link href="/biceek" className={styles.workspaceLink}>
              <Image src="/brand/biceek-icon.svg" alt="" width={48} height={48} className={styles.brandLogo}/>
              <span className={styles.brandName}>Biceek</span>
              <span className={styles.circleArrow}><ArrowRight size={18} aria-hidden="true"/></span>
              </Link>
            </h2>
            <div className={styles.dashboardGrid}>
              <Link href="/biceek/overview" className={styles.dashboard}>
                <span className={`${styles.dashboardIcon} ${styles.tracking}`}><LayoutDashboard size={23} aria-hidden="true"/></span>
                <span className={styles.dashboardTitle}>{t("Overview Dashboard", "总览仪表盘")}</span>
                <span className={styles.smallArrow}><ArrowRight size={16} aria-hidden="true"/></span>
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
    <section className={styles.ai} aria-labelledby="ai-heading">
      <div className={styles.column}>
        <h2 id="ai-heading" className={styles.heading}>AI Tools</h2>
        <p className={styles.intro}>{t("Turn insights into impact with AI.", "借助 AI，让洞察产生价值。")}</p>
        <article className={styles.feature}>
          <div className={styles.featureCopy}>
            <div className={`${styles.featureLabel} ${styles.brandName}`}><span className={styles.featureIcon}><Sparkles size={20}/></span> {t("Dashboard Builder", "仪表盘生成器")}</div>
            <h3>{t("Create tailored marketing dashboards with AI.", "用 AI 创建专属营销仪表盘。")}</h3>
            <p>{t("Turn your marketing data into metric cards, trends and tables, then refine them through conversation.", "将营销数据转化为指标卡片、趋势图和表格，并通过对话持续调整。")}</p>
            <Link href="/ai-tools/dashboard-builder" className={styles.primaryLink}>{t("Open Dashboard Builder", "打开仪表盘生成器")} <ArrowRight size={16}/></Link>
          </div>
        </article>
        <Link href="/ai-tools" className={styles.allTools}>{t("Explore AI Tools", "查看 AI 工具")} <ArrowRight size={16}/></Link>
      </div>
    </section>
  </main>;
}
