import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/site-auth";
import { AccountHeaderGate } from "@/components/application/dashboard/account-header-gate";
import { AccountBreadcrumb } from "@/components/application/dashboard/account-breadcrumb";
import { NovaAccountControls } from "@/app/bluevua/testing/nova-account-controls";
import { SiteHomeLogo } from "@/components/brand/site-home-logo";
import styles from "./account-header.module.css";

export async function AccountHeader() {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return null;
  return <AccountHeaderGate><header className={styles.header}><div className={styles.left}><SiteHomeLogo/><AccountBreadcrumb/></div><NovaAccountControls account={user}/></header></AccountHeaderGate>;
}
