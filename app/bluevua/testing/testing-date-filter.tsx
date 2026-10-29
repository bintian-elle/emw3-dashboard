"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseDate } from "@internationalized/date";
import { DateRangePicker, type DateRangeValue } from "@/components/base/date-picker/date-range-picker";
import { Select, SelectItem } from "@/components/base/select/select";
import type { TestingPeriodPreset } from "@/lib/testing-google";

import { TestingDataLoading } from "./testing-data-loading";
import { useNovaPeriodDraft, validateLatestCompleteRange } from "./nova-reporting-period";

import { redditSinceStartPreset, redditSinceStartLabel } from "@/lib/reddit-testing-period";

type PeriodPreset=TestingPeriodPreset|typeof redditSinceStartPreset;

const options:Array<{id:TestingPeriodPreset;label:string}>=[
  {id:"lastWeek",label:"Last Week (Tue–Mon)"},{id:"wtd",label:"Week-to-date"},{id:"mtd",label:"Month-to-date"},{id:"ytd",label:"Year-to-date"},{id:"last7",label:"Last 7 days"},{id:"last30",label:"Last 30 days"},{id:"last90",label:"Last 90 days"},{id:"custom",label:"Custom"},
];

export function TestingDateFilter({reddit=false}:{reddit?:boolean}){
  const [pending,startTransition]=useTransition();
  const router=useRouter();const pathname=usePathname();const searchParams=useSearchParams();
  const availableOptions=reddit?[{id:redditSinceStartPreset,label:redditSinceStartLabel},...options]:options;
  const requested=searchParams.get("period");
  const {start,end,setStart,setEnd,customDraft,setCustomDraft}=useNovaPeriodDraft(requested,searchParams.get("start"),searchParams.get("end"));
  const selected=customDraft?"custom":availableOptions.some(option=>option.id===requested)?requested!:(reddit?redditSinceStartPreset:"lastWeek");
  const customRange=useMemo<DateRangeValue|undefined>(()=>{try{return start&&end?{start:parseDate(start),end:parseDate(end)}:undefined;}catch{return undefined;}},[start,end]);
  const update=(period:PeriodPreset,range?:DateRangeValue)=>{if(pending)return;const params=new URLSearchParams(searchParams.toString());params.set("period",period);if(period==="custom"&&range){params.set("start",range.start.toString());params.set("end",range.end.toString());}else{params.delete("start");params.delete("end");}if(params.toString()===searchParams.toString())return;startTransition(()=>router.replace(`${pathname}?${params.toString()}`,{scroll:false}));};
  if(pending)return <TestingDataLoading compact/>;
  return <section className="flex flex-wrap items-center gap-3"><div className="flex min-w-0 items-center gap-3"><span className="shrink-0 text-caption-1-semibold text-text-secondary">Reporting period</span><Select className="min-w-0 flex-1 sm:w-48 sm:flex-none" triggerClassName="h-11" selectedKey={selected} popoverClassName="overflow-visible" listBoxStyle={{maxHeight:"none",overflow:"visible"}} onSelectionChange={key=>{const value=String(key) as PeriodPreset;if(value==='custom')setCustomDraft(true);else{setCustomDraft(false);update(value);}}} aria-label="Testing reporting period">{availableOptions.map(option=><SelectItem key={option.id} id={option.id}>{option.label}</SelectItem>)}</Select></div>{selected==="custom"&&<div className="flex min-w-0 flex-wrap items-center gap-3"><span className="shrink-0 text-caption-1-semibold text-text-secondary">Custom range</span><DateRangePicker value={customRange} isDisabled={pending} validateRange={validateLatestCompleteRange} aria-label="Custom testing reporting period" onChange={range=>{if(range){setStart(range.start.toString());setEnd(range.end.toString());update('custom',range);}}}/></div>}</section>;
}
