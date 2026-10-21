"use client";
import { useSyncExternalStore } from "react";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function LanguageSwitcher() {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { language, setLanguage, saving, error } = useSiteLanguage();
  return <div className="shrink-0"><SegmentedControl aria-label="Language / 语言" selectedKeys={new Set([language])} isDisabled={!hydrated || saving} onSelectionChange={keys => { const next = Array.from(keys)[0]; if (next === "en" || next === "zh") setLanguage(next); }}><SegmentedControlItem id="en">EN</SegmentedControlItem><SegmentedControlItem id="zh">中文</SegmentedControlItem></SegmentedControl>{error && <p role="alert" className="mt-1 text-caption-1-regular text-text-error-primary">{error}</p>}</div>;
}
