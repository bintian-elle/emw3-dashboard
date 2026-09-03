"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseDate } from "@internationalized/date";
import { DateRangePicker, type DateRangeValue } from "@/components/base/date-picker/date-range-picker";
import { Select, SelectItem } from "@/components/base/select/select";
import type { TestingPeriodPreset } from "@/lib/testing-google";

const options:Array<{id:TestingPeriodPreset;label:string}>=[
  {id:"lastWeek",label:"Last Week (Tue–Mon)"},{id:"wtd",label:"Week-to-date"},{id:"mtd",label:"Month-to-date"},{id:"ytd",label:"Year-to-date"},{id:"last7",label:"Last 7 days"},{id:"last30",label:"Last 30 days"},{id:"last90",label:"Last 90 days"},{id:"custom",label:"Custom"},
];

export function TestingDateFilter(){
  const router=useRouter();const pathname=usePathname();const searchParams=useSearchParams();
  const selected=(searchParams.get("period")??"lastWeek") as TestingPeriodPreset;
  const customRange=useMemo<DateRangeValue|undefined>(()=>{const start=searchParams.get("start"),end=searchParams.get("end");return start&&end?{start:parseDate(start),end:parseDate(end)}:undefined;},[searchParams]);
  const update=(period:TestingPeriodPreset,range?:DateRangeValue)=>{const params=new URLSearchParams(searchParams.toString());params.set("period",period);if(period==="custom"&&range){params.set("start",range.start.toString());params.set("end",range.end.toString());}else{params.delete("start");params.delete("end");}router.replace(`${pathname}?${params.toString()}`,{scroll:false});};
  return <section className="flex flex-wrap items-end gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-card"><div className="w-full sm:w-72"><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">Reporting period</label><Select selectedKey={selected} popoverClassName="overflow-visible" listBoxStyle={{maxHeight:"none",overflow:"visible"}} onSelectionChange={key=>update(String(key) as TestingPeriodPreset)} aria-label="Testing reporting period">{options.map(option=><SelectItem key={option.id} id={option.id}>{option.label}</SelectItem>)}</Select></div>{selected==="custom"&&<div className="w-full sm:w-auto"><label className="mb-1.5 block text-caption-1-semibold text-text-secondary">Custom range</label><DateRangePicker value={customRange} aria-label="Custom testing reporting period" onChange={range=>{if(range)update("custom",range);}} /></div>}</section>;
}
