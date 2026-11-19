"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import styles from "./site-home-logo.module.css";

/** The company mark is stored locally and links to the site-wide home page. */
export function SiteHomeLogo() {
  const { language } = useSiteLanguage();
  const destination = language === "zh" ? "返回网站首页" : "Go to site home";
  return <Link href="/" className={styles.link} aria-label={destination} title={destination}>
    <Image src="/brand/emw3-logo.gif" width={600} height={140} alt="" unoptimized className={styles.image}/>
    <span className={styles.static} aria-hidden="true">EMW3</span>
  </Link>;
}
