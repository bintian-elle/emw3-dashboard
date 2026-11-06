"use client";

import type { ReactNode } from "react";
import { NovaPreviewShell } from "./nova-preview-shell";
import type { TestingInventory } from "@/lib/testing-inventory";
import {TestingSnapshotWatcher} from "./testing-snapshot-watcher";
import {TestingStagingProvider} from "./testing-staging-context";
import {HistoryReportProvider} from "./nova-history-readout";
import {TestingRollingPeriodBoundary} from "./testing-rolling-period-boundary";

export function TestingDesignPreview({children,account,inventory,promptsEnabled=false}:{children:ReactNode;account:{name:string;email:string;picture?:string}|null;inventory:Promise<TestingInventory>;promptsEnabled?:boolean}) {
 return <><TestingRollingPeriodBoundary/><TestingSnapshotWatcher/><TestingStagingProvider enabled={promptsEnabled}><HistoryReportProvider><NovaPreviewShell promptsEnabled={promptsEnabled} account={account} inventory={inventory}>{children}</NovaPreviewShell></HistoryReportProvider></TestingStagingProvider></>;
}
