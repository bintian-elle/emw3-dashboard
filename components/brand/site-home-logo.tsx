"use client";

import Image from "next/image";
import Link from "next/link";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import styles from "./site-home-logo.module.css";

/** The company mark is stored locally and links to the site-wide home page. */
export function SiteHomeLogo({ href = "/", still = false }: { href?: string; still?: boolean }) {
  const { language } = useSiteLanguage();
  const destination = href === "/script-lab"
    ? (language === "zh" ? "返回 AI Script Lab" : "Go to AI Script Lab")
    : (language === "zh" ? "返回网站首页" : "Go to site home");
  return <Link href={href} className={still ? `${styles.link} ${styles.still}` : styles.link} aria-label={destination} title={destination}>
    <Image src={still ? "/brand/emw3-wordmark.png" : "/brand/emw3-logo.gif"} width={still ? 192 : 600} height={still ? 51 : 140} alt="" unoptimized className={styles.image}/>
    <span className={styles.static} aria-hidden="true">EMW3</span>
  </Link>;
}
