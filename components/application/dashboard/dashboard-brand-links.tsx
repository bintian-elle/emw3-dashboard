"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSiteLanguage } from "./site-language-provider";
import styles from "./account-header.module.css";

export function DashboardBrandLinks() {
  const { language } = useSiteLanguage();

  const pathname = usePathname();
  const brands = [
    { name: "Bluevua", href: "/bluevua", logo: "/brand/bluevua-logo.svg" },
    { name: "Biceek", href: "/biceek", logo: "/brand/biceek-icon.svg" },
  ];
  const current = brands.find(({ href }) => pathname === href || pathname.startsWith(href + "/"));
  const visible = current ? [current] : brands;

  return (
    <nav className={styles.dashboardLinks} aria-label={language === "zh" ? "品牌仪表盘" : "Brand dashboards"}>
      {visible.map(({ name, href, logo }) => (
        <Link key={href} href={href} className={styles.dashboardItem} title={language === "zh" ? `打开 ${name} 品牌页` : `Open ${name} workspace`} aria-current={pathname === href ? "page" : undefined}>
          <Image src={logo} alt="" width={20} height={20} className={styles.dashboardLogo} />
          {name}
        </Link>
      ))}
    </nav>
  );
}
