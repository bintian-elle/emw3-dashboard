import Link from "next/link";
import {
  RiArrowLeftLine,
  RiArrowRightUpLine,
  RiHammerLine,
  RiMailLine,
} from "@remixicon/react";
import { BluevuaMark, Emw3Logo } from "@/components/brand/emw3-logo";
import { ButtonLink } from "@/components/base/buttons/button";

const legacyDashboardUrl = "https://dashboard-elle-media.streamlit.app/";

export default function EdmDashboardPage() {
  return (
    <main className="min-h-screen bg-background-secondary-default px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" aria-label="Go to homepage">
            <Emw3Logo priority className="w-44 sm:w-52" />
          </Link>
          <Link
            href="/bluevua"
            className="inline-flex items-center gap-2 text-body-medium text-text-secondary hover:text-text-primary"
          >
            <RiArrowLeftLine className="size-4" aria-hidden />
            Bluevua
          </Link>
        </header>

        <section className="mt-8 overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card">
          <div className="flex flex-col gap-8 p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:p-14">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <BluevuaMark className="size-12" />
                <span className="flex size-12 items-center justify-center rounded-xl bg-status-yellow-background text-status-yellow-text">
                  <RiMailLine className="size-6" aria-hidden />
                </span>
              </div>
              <p className="mt-8 text-caption-1-semibold text-status-yellow-text">EDM DASHBOARD</p>
              <h1 className="mt-2 text-display-4-semibold text-text-primary">Building the new email analytics workspace</h1>
              <p className="mt-4 text-title-3-regular text-text-secondary">
                We are preparing the EDM dashboard for this workspace. Campaign performance, audience engagement, revenue attribution, and reporting will be migrated here in a future phase.
              </p>
              <div className="mt-7">
                <ButtonLink href={legacyDashboardUrl} trailingIcon={RiArrowRightUpLine}>
                  Open current EDM dashboard
                </ButtonLink>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-3xl bg-background-secondary-default p-6">
              <span className="flex size-12 items-center justify-center rounded-xl bg-status-yellow-background text-status-yellow-text">
                <RiHammerLine className="size-6" aria-hidden />
              </span>
              <p className="mt-5 text-title-2-semibold text-text-primary">Currently building</p>
              <p className="mt-2 text-body-regular text-text-secondary">
                Until the migration is complete, the existing Streamlit dashboard remains available from the link on this page.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
