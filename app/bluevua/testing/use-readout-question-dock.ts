'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';

/** Shared positioning and motion for the insight question form. */
export function useReadoutQuestionDock({expanded,detailsId,bottomId}:{expanded:boolean;detailsId:string;bottomId:string}){
 const [dock,setDock]=useState<{left:number;width:number;top:number}|null>(null);
 const anchorRef=useRef<HTMLDivElement>(null),formRef=useRef<HTMLFormElement>(null),previousRect=useRef<DOMRect|null>(null);
 useEffect(()=>{
  let frame=0;
  const update=()=>{
   const anchor=anchorRef.current,details=document.getElementById(detailsId),bottomAnchor=document.getElementById(bottomId);
   const header=document.querySelector('[data-testing-header]');
   if(!anchor)return;
   const anchorRect=anchor.getBoundingClientRect(),headerBottom=Math.max(0,header?.getBoundingClientRect().bottom??0);
   const shouldDock=expanded&&!!details&&!!bottomAnchor&&anchorRect.bottom<=headerBottom;
   const bottomRect=bottomAnchor?.getBoundingClientRect();
   const next=shouldDock&&bottomRect?{left:bottomRect.left-anchorRect.left,width:bottomRect.width,top:bottomRect.top-anchorRect.top}:null;
   setDock(current=>{
    if((!current&&!next)||(current&&next&&current.left===next.left&&current.width===next.width&&current.top===next.top))return current;
    if(Boolean(current)!==Boolean(next))previousRect.current=formRef.current?.getBoundingClientRect()??null;
    return next;
   });
  };
  const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);};
  // Scroll events in the docked AI layout originate in the page column,
  // while the regular layout scrolls the window. Capture both without
  // rebinding when the layout changes.
  window.addEventListener('scroll',schedule,{passive:true,capture:true});window.addEventListener('resize',schedule);
  const observer=new ResizeObserver(schedule);
  if(anchorRef.current)observer.observe(anchorRef.current);
  const details=document.getElementById(detailsId);if(details)observer.observe(details);
  const bottomAnchor=document.getElementById(bottomId);if(bottomAnchor)observer.observe(bottomAnchor);
  schedule();
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);observer.disconnect();};
 },[bottomId,detailsId,expanded]);
 useLayoutEffect(()=>{
  const previous=previousRect.current,form=formRef.current;previousRect.current=null;
  if(!previous||!form||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const current=form.getBoundingClientRect();
  form.animate([{transform:`translate(${previous.left-current.left}px, ${previous.top-current.top}px)`},{transform:'translate(0, 0)'}],{duration:260,easing:'ease-out'});
 },[dock]);
 return {dock,anchorRef,formRef};
}
