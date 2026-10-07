import { RiShieldKeyholeLine } from "@remixicon/react";
import { Emw3Logo } from "@/components/brand/emw3-logo";
import { AccessForm } from "./access-form";
import { safeReturnPath } from "@/lib/site-auth";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[]; error?: string }> }) {
  const params = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-background-full p-5">
    <section className="w-full max-w-md rounded-3xl border border-border-button-default bg-background-primary-default p-7 shadow-card sm:p-9">
      <Emw3Logo priority className="w-48" />
      <span className="mt-10 flex size-12 items-center justify-center rounded-2xl bg-status-blue-background text-status-blue-text">
        <RiShieldKeyholeLine className="size-6" aria-hidden />
      </span>
      <h1 className="mt-5 text-title-1-semibold text-text-primary">Private Analytics Workspace</h1>
      <p className="mt-2 text-body-regular text-text-secondary">Sign in with your @elle-media.com Google account to continue.</p>
      {params.error&&<p role="alert" className="mt-4 text-body-2-regular text-text-error-primary">{params.error==="domain"?"Only verified @elle-media.com Google Workspace accounts can access this website.":params.error==="configuration"?"Google sign-in is not configured. Please contact the administrator.":"Sign-in could not be completed. Please try again."}</p>}
      <AccessForm returnTo={safeReturnPath(Array.isArray(params.returnTo)?params.returnTo[0]:params.returnTo)} />
    </section>
  </main>;
}
