"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RiCloseLine, RiMailOpenLine } from "@remixicon/react";

export function EmailLightbox({ html, title }: { html: string; title: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return <>
    <button type="button" onClick={() => setOpen(true)} disabled={!html} className="relative h-24 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-border-button-default bg-background-primary-default shadow-card outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring disabled:cursor-default" aria-label={`Preview email: ${title}`}>
      {html ? <iframe srcDoc={html} title={`${title} thumbnail`} tabIndex={-1} className="pointer-events-none h-[768px] w-[640px] origin-top-left scale-15 border-0 bg-background-primary-default" sandbox=""/> : <span className="flex size-full items-center justify-center text-foreground-icon-tertiary"><RiMailOpenLine className="size-6" aria-hidden/></span>}
      {html && <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-separator-border"/>}
    </button>
    {open && html && typeof document !== "undefined" && createPortal(<div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label={`Email preview: ${title}`}><button type="button" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default bg-background-tertiary-default/90 backdrop-blur-sm" aria-label="Close email preview"/><div className="relative flex h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"><div className="flex items-center justify-between gap-4 border-b border-separator-border px-5 py-3"><div className="min-w-0"><p className="text-caption-1-semibold text-text-tertiary">EMAIL PREVIEW</p><p className="truncate text-body-medium text-text-primary">{title}</p></div><button type="button" onClick={() => setOpen(false)} className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-background-secondary-default text-foreground-icon-primary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring" aria-label="Close email preview"><RiCloseLine className="size-6" aria-hidden/></button></div><div className="min-h-0 flex-1 bg-background-secondary-default p-3 sm:p-5"><iframe srcDoc={html} title={title} className="size-full rounded-xl border border-border-button-default bg-background-primary-default" sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"/></div></div></div>,document.body)}
  </>;
}
