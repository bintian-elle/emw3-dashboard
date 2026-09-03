"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RiCloseLine, RiImageLine } from "@remixicon/react";
import { cx } from "@/utils/cx";

export function ImageLightbox({src,alt,size="md"}:{src:string|null;alt:string;size?:"md"|"lg"}) {
  const [open,setOpen]=useState(false);
  useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>event.key==="Escape"&&setOpen(false);document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close);},[open]);
  const dimension=size==="lg"?"size-20":"size-16";
  const image=<span className="relative flex size-full items-center justify-center overflow-hidden rounded-xl bg-background-secondary-default">{src?<Image src={src} alt={alt} fill sizes={size==="lg"?"160px":"128px"} className="pointer-events-none object-cover"/>:<RiImageLine className="size-6 text-foreground-icon-tertiary" aria-hidden/>}</span>;
  const dialogSrc=src;
  return <>{src?<button type="button" onClick={()=>setOpen(true)} className={cx("shrink-0 cursor-zoom-in rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",dimension)} aria-label={`Preview image: ${alt}`}>{image}</button>:<span className={cx("shrink-0",dimension)}>{image}</span>}{open&&dialogSrc&&typeof document!=="undefined"&&createPortal(<div className="fixed inset-0 z-100 flex items-center justify-center p-6" role="dialog" aria-modal="true" aria-label={`Image preview: ${alt}`}><button type="button" onClick={()=>setOpen(false)} className="absolute inset-0 cursor-zoom-out bg-black/70" aria-label="Close image preview"/><div className="relative h-[85dvh] w-[90vw] max-w-6xl"><Image src={dialogSrc} alt={alt} fill sizes="90vw" className="object-contain" priority/><button type="button" onClick={()=>setOpen(false)} className="absolute right-0 top-0 flex size-10 items-center justify-center rounded-full bg-background-primary-default text-foreground-icon-primary shadow-card outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring" aria-label="Close image preview"><RiCloseLine className="size-6" aria-hidden/></button></div></div>,document.body)}</>;
}
