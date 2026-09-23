import { RiShieldKeyholeLine } from "@remixicon/react";
import { Emw3Logo } from "@/components/brand/emw3-logo";
import { AccessForm } from "./access-form";
import { safeReturnPath } from "@/lib/site-auth";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-background-full p-5">
    <section className="w-full max-w-md rounded-3xl border border-border-button-default bg-background-primary-default p-7 shadow-card sm:p-9">
      <Emw3Logo priority className="w-48" />
      <span className="mt-10 flex size-12 items-center justify-center rounded-2xl bg-status-blue-background text-status-blue-text">
        <RiShieldKeyholeLine className="size-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-title-1-semibold text-text-primary">Private Analytics Workspace</h1>
      <p className="mt-2 text-body-regular text-text-secondary">Enter the shared access key to continue. No account is required.</p>
      <AccessForm returnTo={safeReturnPath(params.returnTo)} />
    </section>
  </main>;
}
