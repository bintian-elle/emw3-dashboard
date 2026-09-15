import { accountTimezone, accountToday } from "@/lib/klaviyo-dashboard";
import { EdmDashboard } from "./edm-dashboard";

export default async function EdmDashboardPage() {
  let timezone = "America/New_York";
  try { timezone = await accountTimezone(); } catch {}
  return <EdmDashboard today={accountToday(timezone)} timezone={timezone} />;
}
