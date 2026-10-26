"use client";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Tooltip, TooltipTrigger } from "@/components/base/tooltip/tooltip";
import { SegmentedControl, SegmentedControlItem } from "@/components/base/segmented-control/segmented-control";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
const languageHint = "中文仅用于 AI Insights，其他界面保持英文。";
export function LanguageSwitcher() {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const { language, setLanguage, saving, error } = useSiteLanguage();
  const triggerRef = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const open = hovered || focused;
  return <div className="shrink-0">
    <TooltipTrigger isOpen={open} delay={0} closeDelay={0} onOpenChange={next => {if(!next){setHovered(false);setFocused(false);}}}>
    <div ref={triggerRef} onPointerOverCapture={event => {if(event.pointerType !== "touch")setHovered(true);}} onPointerOutCapture={event => {if(!event.currentTarget.contains(event.relatedTarget as Node | null))setHovered(false);}} onFocusCapture={event => setFocused(event.target.matches(":focus-visible"))} onBlurCapture={event => {if(!event.currentTarget.contains(event.relatedTarget))setFocused(false);}} onKeyDown={event => {if(event.key === "Escape"){setHovered(false);setFocused(false);}}}>
      <SegmentedControl aria-label="Language / 语言" selectedKeys={new Set([language])} isDisabled={!hydrated || saving} onSelectionChange={keys => { const next = Array.from(keys)[0]; if (next === "en" || next === "zh") setLanguage(next); }}>
        <SegmentedControlItem id="en" aria-describedby={open ? hintId : undefined}>EN</SegmentedControlItem>
        <SegmentedControlItem id="zh" aria-describedby={open ? hintId : undefined}>中文</SegmentedControlItem>
      </SegmentedControl>
    </div>
    <Tooltip triggerRef={triggerRef} size="md" placement="bottom" className="max-w-80 px-4 py-3 text-headline-regular transition-none data-[entering]:scale-100 data-[entering]:opacity-100 data-[entering]:blur-none"><span id={hintId}>{languageHint}</span></Tooltip>
    </TooltipTrigger>
    {error && <p role="alert" className="mt-1 text-caption-1-regular text-text-error-primary">{error}</p>}
  </div>;
}
