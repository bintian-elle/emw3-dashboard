import Link from "next/link";
import { RiDashboardLine } from "@remixicon/react";
import { SidebarProjectLink } from "@/components/brand/sidebar-project-link";
import { dataUpdatedThrough } from "@/lib/klaviyo-dashboard";

const formatDate = (value: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(new Date(`${value}T12:00:00Z`));

export async function EdmSidebar() {
  let latestDate = "";
  try { latestDate = await dataUpdatedThrough(); } catch {}

  return (
    <aside className="w-full border-b border-separator-border bg-background-primary-default p-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-col">
        <SidebarProjectLink reportName="EDM Dashboard" />
        <nav className="mt-4 flex gap-1 lg:mt-6 lg:flex-col" aria-label="EDM Dashboard sections">
          <Link
            href="/bluevua/edm"
            aria-current="page"
            className="flex shrink-0 items-center gap-3 rounded-xl bg-button-ghost-background px-3 py-2.5 text-body-medium text-button-ghost-foreground shadow-nav-selected"
          >
            <RiDashboardLine className="size-5" aria-hidden />
            Overview
          </Link>
        </nav>
        <div className="mt-4 rounded-2xl bg-background-secondary-default p-4 lg:mt-auto">
          <p className="text-caption-1-semibold text-text-tertiary">LAST UPDATED</p>
          <p className="mt-2 text-body-medium text-text-primary">
            {latestDate ? `${formatDate(latestDate)} · 5:00 AM ET` : "Unavailable"}
          </p>
          <p className="mt-1 text-caption-2-regular text-text-secondary">Refreshes daily</p>
        </div>
      </div>
    </aside>
  );
}
