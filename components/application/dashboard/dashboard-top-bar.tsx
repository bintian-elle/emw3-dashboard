import type { ComponentProps, ReactNode } from "react";
import { NovaAccountControls } from "@/app/bluevua/testing/nova-account-controls";
import { SiteHomeLogo } from "@/components/brand/site-home-logo";
import { DashboardBrandLinks } from "./dashboard-brand-links";
import styles from "./account-header.module.css";

type Account = ComponentProps<typeof NovaAccountControls>["account"];

export function DashboardTopBarFrame({ brand, controls, label, children }: {
  brand: ReactNode;
  controls: ReactNode;
  label?: string;
  children?: ReactNode;
}) {
  return (
    <header className={styles.header} aria-label={label}>
      <div className={styles.left}>{brand}{children}</div>
      {controls}
    </header>
  );
}

export function DashboardTopBar({ account, children }: { account: Account; children?: ReactNode }) {
  return (
    <DashboardTopBarFrame
      brand={<><SiteHomeLogo /><DashboardBrandLinks /></>}
      controls={<NovaAccountControls account={account} />}
    >
      {children}
    </DashboardTopBarFrame>
  );
}
