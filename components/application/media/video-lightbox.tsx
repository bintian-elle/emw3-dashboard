"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RiCloseLine, RiPlayFill } from "@remixicon/react";

export function VideoLightbox({src,thumbnailUrl,title,size="lg"}:{src:string;thumbnailUrl:string|null;title:string;size?:"md"|"lg"}) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>event.key==="Escape"&&setOpen(false);document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close);},[open]);
  const dimension=size==="lg"?"size-20":"size-16";
  return <><button type="button" onClick={()=>setOpen(true)} className={`${dimension} relative shrink-0 cursor-pointer overflow-hidden rounded-xl bg-background-secondary-default outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring`} aria-label={`Play video: ${title}`}>{thumbnailUrl&&<Image src={thumbnailUrl} alt={title} fill sizes={size==="lg"?"160px":"128px"} className="pointer-events-none object-cover"/>}<span className="pointer-events-none absolute inset-0 flex items-center justify-center"><span className="flex size-9 items-center justify-center rounded-full bg-background-primary-default text-foreground-icon-primary shadow-card"><RiPlayFill className="size-5" aria-hidden/></span></span></button>{open&&typeof document!=="undefined"&&createPortal(<div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={`Video preview: ${title}`}><button type="button" onClick={()=>setOpen(false)} className="absolute inset-0 cursor-default bg-black/70" aria-label="Close video preview"/><div className="relative h-[85dvh] w-full max-w-5xl overflow-hidden rounded-3xl bg-background-primary-default shadow-card"><iframe src={src} title={title} className="size-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/><button type="button" onClick={()=>setOpen(false)} className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-background-primary-default text-foreground-icon-primary shadow-card outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring" aria-label="Close video preview"><RiCloseLine className="size-6" aria-hidden/></button></div></div>,document.body)}</>;
}
