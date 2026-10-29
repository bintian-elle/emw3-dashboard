"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import styles from "./account-header.module.css";

const labels: Record<string, string> = {
  bluevua: "Bluevua",
  google: "Google Ads",
  edm: "EDM",
  tracking: "Website Tracking",
  "ai-tools": "AI Tools",
  "dashboard-builder": "Dashboard Builder",
  new: "New dashboard",
};

/** Show known workspace names without exposing technical route identifiers. */
export function AccountBreadcrumb() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  const crumbs = parts.flatMap((part, index) => labels[part]
    ? [{ label: labels[part], href: `/${parts.slice(0, index + 1).join("/")}` }]
    : []);
  if (!crumbs.length) return <span className={styles.home}>EMW3</span>;

  return <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
    {crumbs.map((crumb, index) => <span className={styles.crumb} key={crumb.href}>
      {index > 0 && <ChevronRight aria-hidden="true"/>}
      {index === crumbs.length - 1 ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
    </span>)}
  </nav>;
}
