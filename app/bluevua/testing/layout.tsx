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
  const user=await currentSiteUser();
  const owner=createHash("sha256").update(user?.sub??"anonymous").digest("hex");
  const account=user?{name:user.name,email:user.email,...(user.picture?{picture:user.picture}:{})}:null;
  // Start a cache-only read once for this layout. Suspended badges stream independently
  // of the page, and the inventory page shares the same request-local React cache.
  const inventoryBaseline=readRememberedSnapshotVersions(testingSnapshotScopes('inventory'));
  const scopedBaseline=readRememberedSnapshotVersionEntries();
  const inventory=getTestingInventory().catch(()=>({items:[],unavailable:["google-search","google-pmax","google-demand-gen","meta","reddit","edm"] as TestingInventoryChannel[]}));
  return <Suspense><ResetPeriodOnReload/><TestingSnapshotBaseline cacheKey={testingSnapshotWatchKey('inventory')} versions={inventoryBaseline}/><TestingAiProvider key={owner} owner={owner}><TestingScopedSnapshotProvider entries={scopedBaseline}><TestingInventoryProvider inventory={inventory}><TestingDesignPreview account={account} inventory={inventory}>{children}</TestingDesignPreview></TestingInventoryProvider></TestingScopedSnapshotProvider></TestingAiProvider></Suspense>;
}
