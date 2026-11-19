import { currentSiteUser } from "@/lib/current-site-user";
import { readMarketSnapshot } from "@/lib/biceek-market-snapshot";
import MarketOverview, { LocalizationReview } from "./market-overview";
import { BiceekWorkspace, type BiceekView } from "./workspace-shell";

export async function MarketDashboardPage({ view = "overview" }: { view?: BiceekView }) {
  const [snapshot, account] = await Promise.all([readMarketSnapshot(), currentSiteUser()]);
  return <BiceekWorkspace view={view} account={account} updatedAt={snapshot?.refreshedAt ?? null}>
    {view === "localization-review" ? <LocalizationReview snapshot={snapshot} /> : <MarketOverview view={view} snapshot={snapshot} />}
  </BiceekWorkspace>;
}
