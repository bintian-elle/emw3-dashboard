import { dataUpdatedThrough } from "@/lib/klaviyo-dashboard";
import { EdmSidebarClient } from "./edm-sidebar-client";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
}).format(new Date(`${value}T12:00:00Z`));

export async function EdmSidebar() {
  let latestDate = "";
  try { latestDate = await dataUpdatedThrough(); } catch {}
  return <EdmSidebarClient updated={latestDate ? `Updated ${formatDate(latestDate)} · 5:00 AM ET` : "Update time unavailable"}/>;
}
