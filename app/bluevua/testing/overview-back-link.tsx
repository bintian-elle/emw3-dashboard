"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RiDashboardLine } from "@remixicon/react";

export function OverviewBackLink() {
  const params=useSearchParams();
  const query=params.toString();
  return <Link href={`/bluevua/testing${query?`?${query}`:""}`} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-body-medium text-text-secondary outline-none hover:bg-background-secondary-hover hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"><RiDashboardLine className="size-4" aria-hidden/>Back to overview</Link>;
}
