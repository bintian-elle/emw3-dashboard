import Link from "next/link";
import { RiArrowLeftLine } from "@remixicon/react";

export function TestingBackNavigation({platform,platformHref,query=""}:{platform:string;platformHref:string;query?:string}) {
  const suffix=query?`?${query}`:"";
  return <nav className="mb-4 flex flex-wrap items-center gap-2" aria-label="Platform navigation"><Link href={`${platformHref}${suffix}`} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-body-medium text-text-secondary outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"><RiArrowLeftLine className="size-4" aria-hidden/>Back to {platform} tests</Link></nav>;
}
