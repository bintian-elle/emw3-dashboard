"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { cx } from "@/utils/cx";

export type GaugeSegment = {
  label: string;
  value: number;
  display: string;
  color: string;
  dot: string;
};

const arc = "M 20 92 A 70 70 0 0 1 160 92";
const pointOnArc = (percent:number) => {
  const angle = (180 + percent * 1.8) * Math.PI / 180;
  return { x: 90 + 70 * Math.cos(angle), y: 92 + 70 * Math.sin(angle) };
};
const segmentArc = (startPercent:number,endPercent:number) => {
  const start = pointOnArc(startPercent);
  const end = pointOnArc(endPercent);
  // Every segment is part of a 180° gauge, so its sweep never exceeds 180°.
  // Using the large-arc flag here would make high-share segments wrap around
  // the outside of the gauge instead of following the intended semicircle.
  return `M ${start.x} ${start.y} A 70 70 0 0 1 ${end.x} ${end.y}`;
};

function numberDisplay(value:string){
  const trimmed=value.trim();
  const numeric=Number(trimmed.replace(/[$,%]/g,"").replaceAll(",",""));
  if(!Number.isFinite(numeric))return null;
  const fraction=trimmed.match(/\.(\d+)/)?.[1].length??0;
  const options={minimumFractionDigits:fraction,maximumFractionDigits:fraction};
  if(trimmed.startsWith("$"))return {numeric,format:(next:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",...options}).format(next)};
  if(trimmed.endsWith("%"))return {numeric,format:(next:number)=>`${new Intl.NumberFormat("en-US",options).format(next)}%`};
  return {numeric,format:(next:number)=>new Intl.NumberFormat("en-US",options).format(next)};
}

function AnimatedMetricValue({value,className}:{value:string;className:string}){
  const reduceMotion=useReducedMotion();
  const parsed=numberDisplay(value);
  const current=useRef(parsed?.numeric??null);
  const [display,setDisplay]=useState(value);

  useEffect(()=>{
    const next=numberDisplay(value);
    if(!next){current.current=null;setDisplay(value);return;}
    const start=current.current??next.numeric;
    current.current=next.numeric;
    if(reduceMotion||start===next.numeric){setDisplay(next.format(next.numeric));return;}
    const controls=animate(start,next.numeric,{duration:0.35,ease:[0.2,0,0,1],onUpdate:latest=>setDisplay(next.format(latest))});
    return ()=>controls.stop();
  },[value,reduceMotion]);

  return <span className={className}>{display}</span>;
}

export function SegmentedGauge({ title, value, caption, segments }: { title: string; value: string; caption: string; segments: GaugeSegment[] }) {
  const reduceMotion = useReducedMotion();
  const headingId = useId();
  const [activeIndex, setActiveIndex] = useState<number|null>(null);
  const total = segments.reduce((sum, item) => sum + Math.max(0, item.value), 0);
  const actualShares = segments.map(item=>total>0?Math.max(0,item.value)/total*100:0);
  const positiveIndexes = segments.flatMap((item,index)=>item.value>0?[index]:[]);
  // Reserve a minimum angular slot for non-zero values so neighboring round
  // caps remain distinct. Labels and percentages continue to use real shares.
  const visualWeights = actualShares.map(share=>share>0?Math.max(share,10):0);
  const visualTotal = visualWeights.reduce((sum,weight)=>sum+weight,0);
  const visualShares = visualWeights.map(weight=>visualTotal>0?weight/visualTotal*100:0);
  const firstPositiveIndex = positiveIndexes[0]??0;
  const lastPositiveIndex = positiveIndexes.at(-1)??0;
  const defaultIndex = firstPositiveIndex;
  const selectedIndex = activeIndex ?? defaultIndex;
  const selected = segments[selectedIndex];
  const selectedShare = selected && total > 0 ? selected.value / total : 0;
  // The normalized arc is ~220px long. An 8-unit centerline gap leaves
  // visible space after the 14–16px round caps extend into it.
  const gap = positiveIndexes.length > 1 ? 7.5 : 0;
  const displayTitle = activeIndex == null ? title : selected?.label ?? title;
  const displayValue = activeIndex == null ? value : selected?.display ?? value;
  let offset = 0;
  const transition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.2, 0, 0, 1] as const };

  const select = (index:number) => setActiveIndex(index);
  const reset = () => setActiveIndex(null);

  return <div onMouseLeave={reset}>
    <div className="min-h-14">
      <AnimatePresence mode="wait" initial={false}>
        <motion.h3 key={displayTitle} id={headingId} className="text-body-2-regular text-text-secondary" initial={reduceMotion?false:{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={reduceMotion?undefined:{opacity:0,y:-3}} transition={transition}>{displayTitle}</motion.h3>
      </AnimatePresence>
      <p className="mt-0.5"><AnimatedMetricValue value={displayValue} className="text-title-2-medium tabular-nums text-text-primary"/></p>
    </div>
    <div className="relative mx-auto h-36 max-w-sm">
      <svg viewBox="0 0 180 110" className="size-full overflow-visible" role="group" aria-labelledby={headingId}>
        <path d={arc} pathLength="100" fill="none" className="stroke-chart-track" strokeWidth="14" strokeLinecap="round" aria-hidden />
        {segments.map((item, index) => {
          const share = actualShares[index];
          const visualShare = visualShares[index];
          const rawStart = offset;
          const rawEnd = offset+visualShare;
          offset += visualShare;
          if(share<=0)return null;
          let visibleStart = rawStart+(index===firstPositiveIndex?0:gap/2);
          let visibleEnd = rawEnd+(index===lastPositiveIndex?0:-gap/2);
          if(share>0&&visibleEnd<=visibleStart){const midpoint=(rawStart+rawEnd)/2;visibleStart=midpoint-0.02;visibleEnd=midpoint+0.02;}
          const isSelected = index === selectedIndex;
          return <motion.path
            key={item.label}
            d={segmentArc(visibleStart,visibleEnd)}
            fill="none"
            className={cx(item.color,"cursor-pointer outline-none focus-visible:drop-shadow-sm")}
            strokeLinecap="round"
            role="button"
            tabIndex={0}
            aria-label={`${item.label}: ${item.display}, ${Math.round(share)}% of ${caption}`}
            onMouseEnter={()=>select(index)}
            onFocus={()=>select(index)}
            onBlur={reset}
            initial={reduceMotion?false:{pathLength:0,opacity:0}}
            animate={{pathLength:1,strokeWidth:isSelected?16:14,opacity:activeIndex!=null&&!isSelected?0.25:1}}
            transition={reduceMotion?{duration:0}:{pathLength:{duration:0.65,delay:index*0.1,ease:[0.2,0,0,1]},strokeWidth:{duration:0.15,ease:[0.2,0,0,1]},opacity:{duration:0.15,ease:[0.2,0,0,1]}}}
          />;
        })}
      </svg>
      <motion.div className="pointer-events-none absolute inset-x-0 bottom-1 text-center" initial={reduceMotion?false:{opacity:0,y:5}} animate={{opacity:1,y:0}} transition={transition}>
        <p><AnimatedMetricValue value={new Intl.NumberFormat("en-US",{style:"percent",maximumFractionDigits:0}).format(selectedShare)} className="text-title-1-medium tabular-nums text-text-primary"/></p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={selected?.label??caption} className="text-caption-2-regular text-text-tertiary" initial={reduceMotion?false:{opacity:0,y:3}} animate={{opacity:1,y:0}} exit={reduceMotion?undefined:{opacity:0,y:-2}} transition={transition}>{selected?.label??caption}</motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
    <div className="mt-2 flex flex-wrap justify-center gap-x-2 gap-y-1">
      {segments.map((item,index)=><button key={item.label} type="button" onMouseEnter={()=>select(index)} onFocus={()=>select(index)} onBlur={reset} className={cx("inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-body-2-regular text-text-secondary outline-none transition-[opacity,background-color] duration-150 hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring",activeIndex!=null&&index!==selectedIndex&&"opacity-40")}><span className={cx("size-2.5 rounded-full",item.dot)}/>{item.label} <strong className="text-body-2-medium text-text-primary">{item.display}</strong></button>)}
    </div>
  </div>;
}
