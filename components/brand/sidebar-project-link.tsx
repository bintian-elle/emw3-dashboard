import Link from "next/link";
import Image from "next/image";
import { ButtonLink } from "@/components/base/buttons/button";
import { Emw3Logo } from "@/components/brand/emw3-logo";

export function SidebarProjectLink({ reportName }: { reportName?: "Google Dashboard" | "EDM Dashboard" | "Testing" }) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="inline-flex w-fit px-2 py-1" aria-label="Go to the EMW3 homepage">
        <Emw3Logo className="w-36" />
      </Link>
      <ButtonLink
        href="/bluevua"
        variant="secondary"
        className="h-auto w-full justify-center p-3 [&>span]:min-w-0 [&>span]:flex-1 [&>span]:px-0"
        aria-label="Open the Bluevua project homepage"
      >
        <span className="flex w-full items-center gap-3">
          <Image src="/brand/bluevua-logo.svg" alt="Bluevua logo" width={40} height={40} className="size-10 shrink-0 rounded-xl" />
          <span className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <span className="text-headline-medium text-text-primary">Bluevua</span>
            <span className="text-body-2-medium text-text-secondary">Project Home</span>
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
