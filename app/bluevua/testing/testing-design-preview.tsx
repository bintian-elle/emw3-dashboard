"use client";

import type { ReactNode } from "react";
import { NovaPreviewShell } from "./nova-preview-shell";
import type { TestingInventory } from "@/lib/testing-inventory";
import {TestingSnapshotWatcher} from "./testing-snapshot-watcher";
import {TestingRollingPeriodBoundary} from "./testing-rolling-period-boundary";

export function TestingDesignPreview({children,account,inventory}:{children:ReactNode;account:{name:string;email:string;picture?:string}|null;inventory:Promise<TestingInventory>}) {
 return <><TestingRollingPeriodBoundary/><TestingSnapshotWatcher/><NovaPreviewShell account={account} inventory={inventory}>{children}</NovaPreviewShell></>;
}
