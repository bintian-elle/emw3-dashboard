"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RiSparkling2Line } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { cx } from "@/utils/cx";

export function ReadoutQuestion({onAsk,onOpen,canAsk,overview,expanded,detailsId,bottomId,channelOverview=false}:{onAsk:(question:string)=>Promise<boolean>;onOpen:()=>void;canAsk:boolean;overview:boolean;expanded:boolean;detailsId:string;bottomId:string;channelOverview?:boolean}){
 const [question,setQuestion]=useState('');
 const [dock,setDock]=useState<{left:number;width:number;top:number}|null>(null);
 const anchorRef=useRef<HTMLDivElement>(null);
 const formRef=useRef<HTMLFormElement>(null);
 const previousRect=useRef<DOMRect|null>(null);
 const {language}=useSiteLanguage(),zh=language==='zh';

 useEffect(()=>{
  let frame=0;
  const update=()=>{
   const anchor=anchorRef.current, details=document.getElementById(detailsId), bottomAnchor=document.getElementById(bottomId);
   const header=document.querySelector('[data-testing-header]');
   if(!anchor) return;
   const anchorRect=anchor.getBoundingClientRect();
   const headerBottom=Math.max(0,header?.getBoundingClientRect().bottom ?? 0);
   const shouldDock=expanded && !!details && !!bottomAnchor && anchorRect.bottom<=headerBottom;
   const bottomRect=bottomAnchor?.getBoundingClientRect();
   const next=shouldDock && bottomRect ? {left:bottomRect.left-anchorRect.left,width:bottomRect.width,top:bottomRect.top-anchorRect.top} : null;
   setDock(current=>{
    if((!current&&!next)||(current&&next&&current.left===next.left&&current.width===next.width&&current.top===next.top)) return current;
    if(Boolean(current)!==Boolean(next)) previousRect.current=formRef.current?.getBoundingClientRect() ?? null;
    return next;
   });
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  const observer=new ResizeObserver(schedule);
  if(anchorRef.current) observer.observe(anchorRef.current);
  const details=document.getElementById(detailsId);
  if(details) observer.observe(details);
  const bottomAnchor=document.getElementById(bottomId);
  if(bottomAnchor) observer.observe(bottomAnchor);
  schedule();
  return ()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);observer.disconnect();};
 },[bottomId,detailsId,expanded]);

 useLayoutEffect(()=>{
  const previous=previousRect.current, form=formRef.current;
  previousRect.current=null;
  if(!previous || !form || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const current=form.getBoundingClientRect();
  form.animate([{transform:`translate(${previous.left-current.left}px, ${previous.top-current.top}px)`},{transform:'translate(0, 0)'}],{duration:260,easing:'ease-out'});
 },[dock]);

 return <div ref={anchorRef} className="relative min-h-10 min-w-64 flex-1">
  <form ref={formRef} aria-label={channelOverview?(zh?'询问渠道洞察':'Ask about channel insights'):overview?(zh?'询问整体洞察':'Ask about Overview insights'):(zh?'询问 Campaign 洞察':'Ask about campaign insights')} data-docked={dock?'true':'false'} style={dock?{left:dock.left,width:dock.width,top:dock.top}:undefined} className={cx('flex flex-wrap items-center gap-2',dock&&'absolute z-10')} onSubmit={event=>{event.preventDefault();if(question.trim()){const submitted=question;void onAsk(submitted.trim()).then(sent=>{if(sent)setQuestion(current=>current===submitted?'':current);});}else onOpen();}}>
   <Input className="min-w-32 flex-1" aria-label={zh?'输入关于这些洞察的问题':'Enter a question about these insights'} placeholder={overview?(zh?'基于这些洞察提问…':'Ask about these insights…'):(zh?'询问此 Campaign…':'Ask about this campaign…')} value={question} onChange={setQuestion} maxLength={2000}/>
   <Button type="submit" variant="secondary" size="small" className="min-h-10 shrink-0" leadingIcon={RiSparkling2Line} aria-label={channelOverview?(zh?'询问渠道洞察':'Ask about channel insights'):overview?(zh?'询问 Overview':'Ask about Overview'):(zh?'追问此 Campaign':'Ask about this campaign')} disabled={!canAsk}>{zh?'询问 AI':'Ask AI'}</Button>
  </form>
 </div>;
}
