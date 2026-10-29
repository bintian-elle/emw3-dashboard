import type {OverviewHeadlineMetrics} from '@/lib/overview-headline-metrics';
import {TestingPromptPreviewReport} from "./prompt-preview-report";
import { TestingAskButton } from "./testing-ai";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/base/buttons/button";
import { RiArrowLeftLine, RiArrowRightSLine } from "@remixicon/react";
import { TestingDateFilter } from "./testing-date-filter";
import { OverviewBackLink } from "./overview-back-link";
import { NovaSubpageHeaderGate } from "./nova-subpage-header";

export function TestingPageHeader({section,title,description,redditDateFilter=false,showReportingPeriod=true,overviewMetrics,backHref,backLabel="Back to campaign",sharePeriod}:{section?:string;title:string;description?:string;redditDateFilter?:boolean;showReportingPeriod?:boolean;overviewMetrics?:OverviewHeadlineMetrics;backHref?:string;backLabel?:string;sharePeriod?:{start:string;end:string}}) {
  return <Suspense><NovaSubpageHeaderGate section={section} title={title} redditDateFilter={redditDateFilter} showReportingPeriod={showReportingPeriod} backHref={backHref} backLabel={backLabel} overviewMetrics={overviewMetrics} sharePeriod={sharePeriod}><div data-testing-header className="@container sticky top-0 z-20 -mx-4 mb-6 border-b border-separator-border bg-background-secondary-default px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="mx-auto flex max-w-[1500px] flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:justify-between"><header className="min-w-0"><div className="flex items-center gap-1 text-caption-1-semibold text-text-tertiary"><Link href="/bluevua">Bluevua</Link><RiArrowRightSLine className="size-4" aria-hidden /><Link href="/bluevua/testing">Testing</Link>{section&&<><RiArrowRightSLine className="size-4" aria-hidden />{section}</>}</div><h1 className="mt-1 break-words text-title-1-semibold text-text-primary">{title}</h1>{description&&<p className="mt-1 max-w-3xl text-body-regular text-text-secondary">{description}</p>}{section&&<div className="mt-2 flex flex-wrap items-center gap-2">{backHref&&<ButtonLink href={backHref} variant="secondary" size="small" leadingIcon={RiArrowLeftLine} className="min-h-10">{backLabel}</ButtonLink>}<Suspense><OverviewBackLink /></Suspense></div>}</header><div className="flex shrink-0 flex-wrap items-center gap-4 @3xl:flex-nowrap">{showReportingPeriod&&<Suspense><TestingDateFilter reddit={redditDateFilter}/></Suspense>}<TestingAskButton/></div></div></div><Suspense><TestingPromptPreviewReport overviewMetrics={overviewMetrics}/></Suspense></NovaSubpageHeaderGate></Suspense>;
}
