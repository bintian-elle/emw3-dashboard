import Link from "next/link";
import { Suspense } from "react";
import { RiArrowRightSLine } from "@remixicon/react";
import { TestingDateFilter } from "./testing-date-filter";
import { OverviewBackLink } from "./overview-back-link";

export function TestingPageHeader({section,title,description}:{section?:string;title:string;description?:string}) {
  return <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-separator-border bg-background-secondary-default px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"><div className="mx-auto flex max-w-[1500px] flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><header className="min-w-0"><div className="flex items-center gap-1 text-caption-1-semibold text-text-tertiary"><Link href="/bluevua">Bluevua</Link><RiArrowRightSLine className="size-4" aria-hidden /><Link href="/bluevua/testing">Testing</Link>{section&&<><RiArrowRightSLine className="size-4" aria-hidden />{section}</>}</div><h1 className="mt-1 text-title-1-semibold text-text-primary">{title}</h1>{description&&<p className="mt-1 max-w-3xl text-body-regular text-text-secondary">{description}</p>}{section&&<div className="mt-2"><Suspense><OverviewBackLink /></Suspense></div>}</header><Suspense><TestingDateFilter /></Suspense></div></div>;
}
