import { currentSiteUser } from "@/lib/current-site-user";
import { createHash } from "node:crypto";
import { accountTimezone, accountToday } from "@/lib/klaviyo-dashboard";
import { EdmDashboard } from "./edm-dashboard";

export default async function EdmDashboardPage() {
  let timezone = "America/New_York";
  try { timezone = await accountTimezone(); } catch {}
  const user=await currentSiteUser();
  const cacheOwner=createHash("sha256").update(user?.sub??"anonymous").digest("hex");
  return <EdmDashboard key={cacheOwner} cacheOwner={cacheOwner} today={accountToday(timezone)} timezone={timezone} />;
}
