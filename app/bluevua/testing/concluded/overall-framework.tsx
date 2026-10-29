"use client";

import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import framework from "@/config/testing-overall-framework.json";
import styles from "./concluded-overview.module.css";

type Framework = { goal: string; hypothesis: string };
export function OverallFramework() {
  const { language } = useSiteLanguage();
  const text = framework[language] as Framework | null;
  if (!text) return null;
  const zh = language === "zh";
  return <section className={styles.framework} aria-label={zh ? "全部测试的目标与假设" : "Overall testing goal and hypothesis"}>
    <div><h2>{zh ? "测试目标" : "Test goal"}</h2><p>{text.goal}</p></div>
    <div><h2>{zh ? "测试假设" : "Hypothesis"}</h2><p>{text.hypothesis}</p></div>
  </section>;
}
