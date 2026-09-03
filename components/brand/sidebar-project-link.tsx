import { RiArrowRightSLine } from "@remixicon/react";
import Link from "next/link";
import { ButtonLink } from "@/components/base/buttons/button";
import { BluevuaMark, Emw3Logo } from "@/components/brand/emw3-logo";

export function SidebarProjectLink({ reportName }: { reportName?: "Dashboard" | "Testing" }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="inline-flex w-fit px-2 py-1" aria-label="Go to the EMW3 homepage">
        <Emw3Logo className="w-36" />
      </Link>
      <ButtonLink
        href="/bluevua"
        variant="secondary"
        trailingIcon={RiArrowRightSLine}
        className="h-auto w-full justify-start p-2.5 [&>span]:min-w-0 [&>span]:flex-1 [&>span]:justify-start [&>span]:px-0"
        aria-label="Open the Bluevua project homepage"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <BluevuaMark className="size-10 shrink-0 rounded-xl" />
          <span className="min-w-0 text-left">
            <span className="block text-body-medium text-text-primary">Bluevua</span>
            <span className="block truncate text-caption-2-regular text-text-secondary">Project home</span>
          </span>
        </span>
      </ButtonLink>
      {reportName && (
        <div className="flex items-center gap-3 px-3" aria-label={`Current report: ${reportName}`}>
          <span className="h-px flex-1 bg-separator-border" />
          <span className="rounded-full bg-button-ghost-background px-3 py-1 text-caption-1-semibold text-button-ghost-foreground">
            {reportName}
          </span>
          <span className="h-px flex-1 bg-separator-border" />
        </div>
      )}
    </div>
  );
}
