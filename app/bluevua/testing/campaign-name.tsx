"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { TestingFrameworkKey } from "@/lib/testing-framework";

const paths: Partial<Record<TestingFrameworkKey, string>> = {
  "google-search": "google/search", "google-pmax": "google/pmax", "google-demand-gen": "google/demand-gen",
  meta: "meta", "reddit-awareness": "reddit", "reddit-conversion": "reddit", edm: "edm",
};
export function CampaignName({ name, channel }: { name: string; channel: TestingFrameworkKey }) {
  const pathname = usePathname();
  const params = useSearchParams();
  if (pathname !== "/bluevua/testing" || !paths[channel]) return <>{name}</>;
  const query = new URLSearchParams(params.toString());
  query.set("campaign", name);
  return <Link prefetch={false} href={`/bluevua/testing/${paths[channel]}?${query}`} className="text-status-blue-text underline underline-offset-4 outline-none hover:decoration-2 focus-visible:ring-2 focus-visible:ring-border-focus-ring">{name}</Link>;
}
