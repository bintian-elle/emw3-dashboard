import {testingPromptRevisions} from '@/lib/testing-prompt-revisions.server';
import {usesUnifiedLocalReports} from '@/lib/testing-report-environment';
import {canAccessReviewTools} from '@/lib/review-access';
import {TemporaryReportOwnerProvider} from './temporary-report-owner';
import {readIntegratedReports} from '@/lib/testing-integrated-reports.server';
import {IntegratedPresentationProvider} from './insight-presentation';
import {TestingComparisonProvider} from "./testing-comparison";
import {InsightAssetsProvider} from "./insight-assets";
import {readInsightAssets} from "@/lib/testing-insight-assets.server";
import { currentSiteUser } from "@/lib/current-site-user";
import { createHash } from "node:crypto";
import { TestingAiProvider } from "./testing-ai";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { TestingDesignPreview } from "./testing-design-preview";
import { ResetPeriodOnReload } from "./reset-period-on-reload";
import { getTestingInventory, type TestingInventoryChannel } from "@/lib/testing-inventory";
import { TestingInventoryProvider } from "./testing-inventory-context";
import {readRememberedSnapshotVersionEntries,readRememberedSnapshotVersions} from "@/lib/testing-data-cache";
import {testingSnapshotScopes,testingSnapshotWatchKey} from "@/lib/testing-snapshot-watch";
import {TestingScopedSnapshotProvider,TestingSnapshotBaseline} from "./testing-snapshot-baseline";

export default async function TestingLayout({children}:{children:ReactNode}) {
  const [user,assets,integrated,revisions]=await Promise.all([currentSiteUser(),readInsightAssets(),readIntegratedReports(),testingPromptRevisions()]);
  const owner=createHash("sha256").update(user?.sub??"anonymous").digest("hex");
  const account=user?{name:user.name,email:user.email,...(user.picture?{picture:user.picture}:{})}:null;
  // Start a cache-only read once for this layout. Suspended badges stream independently
  // of the page, and the inventory page shares the same request-local React cache.
  const inventoryBaseline=readRememberedSnapshotVersions(testingSnapshotScopes('inventory'));
  const scopedBaseline=readRememberedSnapshotVersionEntries();
  const inventory=getTestingInventory().catch(()=>({items:[],unavailable:["google-search","google-pmax","google-demand-gen","meta","reddit","edm"] as TestingInventoryChannel[]}));
  return <Suspense><ResetPeriodOnReload/><TestingSnapshotBaseline cacheKey={testingSnapshotWatchKey('inventory')} versions={inventoryBaseline}/><TestingAiProvider key={owner} owner={owner}><TemporaryReportOwnerProvider owner={owner} revisions={revisions} clearLocalCache={usesUnifiedLocalReports()}><TestingScopedSnapshotProvider entries={scopedBaseline}><TestingInventoryProvider inventory={inventory}><InsightAssetsProvider assets={assets}><TestingComparisonProvider enabled><IntegratedPresentationProvider bundle={integrated}><TestingDesignPreview promptsEnabled={canAccessReviewTools(user)} account={account} inventory={inventory}>{children}</TestingDesignPreview></IntegratedPresentationProvider></TestingComparisonProvider></InsightAssetsProvider></TestingInventoryProvider></TestingScopedSnapshotProvider></TemporaryReportOwnerProvider></TestingAiProvider></Suspense>;
}
