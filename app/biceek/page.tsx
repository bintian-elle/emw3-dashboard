"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChartPie } from "lucide-react";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import styles from "../workspace-entry.module.css";

export default function BiceekProject() {
  const { language } = useSiteLanguage();
  const zh = language === "zh";

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.topline}>
          <Link href="/" className={styles.back}><ArrowLeft size={15} aria-hidden="true" />{zh ? "所有工作区" : "All workspaces"}</Link>
        </div>
        <div className={styles.projectHeading}>
          <Image src="/brand/biceek-icon.svg" alt="" width={48} height={48} className={styles.projectLogo} />
          <h1 className={styles.heading}>Biceek</h1>
        </div>
        <section className={styles.section} aria-labelledby="dashboard-heading">
          <h2 id="dashboard-heading" className={styles.sectionTitle}>{zh ? "仪表盘" : "Dashboards"}</h2>
          <div className={styles.grid}>
            <Link href="/biceek/overview" className={styles.card}>
              <div className={styles.cardTop}><span className={styles.icon}><ChartPie size={18} aria-hidden="true" /></span><ArrowRight size={16} aria-hidden="true" /></div>
              <h3 className={styles.cardTitle}>{zh ? "总览仪表盘" : "Overview Dashboard"}</h3>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
