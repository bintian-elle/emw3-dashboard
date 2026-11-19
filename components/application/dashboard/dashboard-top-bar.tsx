import type { ComponentProps, ReactNode } from "react";
import { NovaAccountControls } from "@/app/bluevua/testing/nova-account-controls";
import { SiteHomeLogo } from "@/components/brand/site-home-logo";
import { DashboardBrandLinks } from "./dashboard-brand-links";
import styles from "./account-header.module.css";

type Account = ComponentProps<typeof NovaAccountControls>["account"];

export function DashboardTopBar({ account, children }: { account: Account; children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <SiteHomeLogo />
        <DashboardBrandLinks />
        {children}
      </div>
      <NovaAccountControls account={account} />
    </header>
  );
}
