"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, ChartNoAxesColumn, FlaskConical, LayoutDashboard, Mail, MessageSquareText, MousePointer2, Sparkles } from "lucide-react";
import styles from "./home.module.css";
import dashboardIllustration from "../public/brand/dashboard-builder-illustration.png";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

const dashboards = [
  { name: "Google Ads", zhName: "Google 广告", description: "Explore campaign performance and key insights.", zhDescription: "查看广告活动表现和关键洞察。", href: "/bluevua/google", icon: ChartNoAxesCombined, color: "google" },
  { name: "EDM", zhName: "邮件营销", description: "Analyze email marketing performance and engagement.", zhDescription: "分析邮件营销表现和互动情况。", href: "/bluevua/edm", icon: Mail, color: "edm" },
  { name: "Website Tracking", zhName: "网站追踪", description: "Understand user behavior across the Bluevua website.", zhDescription: "了解用户在 Bluevua 网站上的行为。", href: "/bluevua/tracking", icon: MousePointer2, color: "tracking" },
  { name: "Content Testing", zhName: "内容测试", description: "Compare and learn from content performance.", zhDescription: "比较内容表现并总结经验。", href: "/bluevua/testing", icon: FlaskConical, color: "testing" },
] as const;

export default function Home() {
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  return <main className={styles.home}>
    <section className={styles.workspaces} aria-labelledby="workspaces-heading">
      <div className={styles.column}>
        <h1 id="workspaces-heading" className={styles.heading}>{t("Workspaces", "工作区")}</h1>
        <p className={styles.intro}>{t("Access brand workspaces to explore marketing data and insights across channels in one place.", "进入品牌工作区，在一处查看各渠道的营销数据与洞察。")}</p>
        <div className={styles.workspaceList}>
          <article className={styles.workspace}>
            <Link href="/bluevua" className={styles.workspaceLink} aria-label={t("Open Bluevua workspace", "打开 Bluevua 工作区")}>
              <Image src="/brand/bluevua-logo.svg" alt="" width={48} height={48} className={styles.brandLogo}/>
              <span className={styles.brandName}>Bluevua</span><span className={styles.circleArrow}><ArrowRight size={18}/></span>
            </Link>
            <p className={styles.eyebrow}>{t("Marketing analytics workspace", "营销分析工作区")}</p>
            <p className={styles.workspaceDescription}>{t("Explore key marketing data and analysis across channels for smarter decision making.", "查看各渠道的关键营销数据和分析，辅助决策。")}</p>
            <div className={styles.dashboardGrid}>
              {dashboards.map(({name, zhName, description, zhDescription, href, icon: Icon, color}) => <Link key={href} href={href} className={styles.dashboard}>
                <span className={`${styles.dashboardIcon} ${styles[color]}`}>{color === "google" ? <Image src="/brand/channels/google-ads.svg" width={30} height={30} alt=""/> : <Icon size={23}/>}</span>
                <span className={styles.dashboardTitle}>{name === "Google Ads" || name === "EDM" ? name : t(name, zhName)}</span><span className={styles.dashboardDescription}>{t(description, zhDescription)}</span>
                <span className={styles.smallArrow}><ArrowRight size={16}/></span>
              </Link>)}
            </div>
          </article>
        </div>
      </div>
    </section>
    <section className={styles.ai} aria-labelledby="ai-heading">
      <div className={styles.column}>
        <p className={styles.eyebrow}>{t("AI Tools workspace", "AI 工具工作区")}</p>
        <h2 id="ai-heading" className={styles.heading}>{t("Turn insights into impact with AI.", "借助 AI，让洞察产生价值。")}</h2>
        <p className={styles.intro}>{t("Explore your marketing data and build reports through conversation.", "通过对话探索营销数据并创建报告。")}</p>
        <article className={styles.feature}>
          <div className={styles.featureCopy}>
            <div className={styles.featureLabel}><span className={styles.featureIcon}><Sparkles size={20}/></span> {t("Dashboard Builder", "仪表盘生成器")}</div>
            <h3>{t("Create tailored marketing dashboards with AI.", "用 AI 创建专属营销仪表盘。")}</h3>
            <p>{t("Turn your marketing data into metric cards, trends and tables, then refine them through conversation.", "将营销数据转化为指标卡片、趋势图和表格，并通过对话持续调整。")}</p>
            <Link href="/ai-tools/dashboard-builder" className={styles.primaryLink}>{t("Open Dashboard Builder", "打开仪表盘生成器")} <ArrowRight size={16}/></Link>
          </div>
          <Image src={dashboardIllustration} alt="" unoptimized className={styles.illustration}/>
        </article>
        <div className={styles.capabilities} aria-label={t("Dashboard Builder capabilities", "仪表盘生成器功能")}>
          <div><span className={styles.capabilityIcon}><MessageSquareText size={20}/></span><h3>{t("Explore", "探索")}</h3><p>{t("Ask questions about your marketing data.", "针对营销数据提出问题。")}</p></div>
          <div><span className={styles.capabilityIcon}><ChartNoAxesColumn size={20}/></span><h3>{t("Visualize", "可视化")}</h3><p>{t("Build metric cards, trends and tables.", "创建指标卡片、趋势图和表格。")}</p></div>
          <div><span className={styles.capabilityIcon}><LayoutDashboard size={20}/></span><h3>{t("Refine", "调整")}</h3><p>{t("Develop dashboards through conversation.", "通过对话完善仪表盘。")}</p></div>
        </div>
        <Link href="/ai-tools" className={styles.allTools}>{t("Explore AI Tools", "查看 AI 工具")} <ArrowRight size={16}/></Link>
      </div>
    </section>
  </main>;
}
