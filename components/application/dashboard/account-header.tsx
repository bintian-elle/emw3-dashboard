import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/site-auth";
import { AccountHeaderGate } from "@/components/application/dashboard/account-header-gate";
import { AccountBreadcrumb } from "@/components/application/dashboard/account-breadcrumb";

import { DashboardTopBar } from "./dashboard-top-bar";

export async function AccountHeader() {
  const user = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!user) return null;
  return <AccountHeaderGate><DashboardTopBar account={user}><AccountBreadcrumb /></DashboardTopBar></AccountHeaderGate>;
}
