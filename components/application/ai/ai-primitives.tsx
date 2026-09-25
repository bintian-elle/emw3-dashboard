"use client";

import { RiArrowDownSLine, RiCheckboxCircleLine } from "@remixicon/react";
import { cx } from "@/utils/cx";

export function AiPixelMark({active=false,className}:{active?:boolean;className?:string}){
 return <span aria-hidden className={cx("grid size-8 shrink-0 grid-cols-3 gap-0.5",className)}>{Array.from({length:9},(_,index)=><i key={index} className={cx("rounded-[2px] bg-accent-600",active?"bui-ai-pixel":"opacity-70")} style={active?{animationDelay:`${index*90}ms`}:undefined}/>)}</span>
}

export function AiActivityTrace({steps,elapsed,label}:{steps:string[];elapsed:number;label:string}){
 const current=steps.at(-1);
 return <details className="group rounded-2xl border border-border-button-default bg-background-secondary-default" open>
  <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring">
   <AiPixelMark active/>
   <span className="min-w-0 flex-1"><span className="block text-body-medium text-text-primary">{label} · {elapsed}s</span>{current&&<span className="agent-progress-loading-text block truncate text-body-2-regular">{current}</span>}</span>
   <RiArrowDownSLine className="size-5 shrink-0 text-foreground-icon-tertiary transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none" aria-hidden/>
  </summary>
  <ol className="space-y-3 border-t border-separator-border px-4 py-4">{steps.map((step,index)=>{const active=index===steps.length-1;return <li key={`${step}-${index}`} className="grid grid-cols-[20px_minmax(0,1fr)] items-start gap-2.5">{active?<span className="mt-1 flex size-3 items-center justify-center" aria-hidden><span className="size-1.5 rounded-full bg-accent-600"/></span>:<RiCheckboxCircleLine className="mt-0.5 size-4 text-status-lime-text" aria-hidden/>}<span className={cx("text-body-2-regular",active?"text-text-primary":"text-text-tertiary")}>{step}</span></li>})}</ol>
 </details>
}

export function AiAnswerHeader({label}:{label:string}){return <div className="flex items-center gap-3"><AiPixelMark/><h3 className="text-title-3-semibold text-accent-700">{label}</h3></div>}
