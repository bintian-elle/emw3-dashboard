import { ButtonLink } from "@/components/base/buttons/button";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { currentSiteUser } from "@/lib/current-site-user";
import { ShieldCheck } from "lucide-react";
import { AccessForm } from "./access-form";
import { safeReturnPath, shouldUseStagingHandoff } from "@/lib/site-auth";
import styles from "../workspace-entry.module.css";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[]; error?: string; signedOut?: string }> }) {
  const params = await searchParams;
  const returnTo = safeReturnPath(Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo);
  if(shouldUseStagingHandoff(process.env.DEPLOYMENT_ENV, process.env.NODE_ENV, (await headers()).get("host"))){
    if(params.signedOut==='1')return <main className={styles.accessPage}><section className={styles.accessCard}><h1 className={styles.accessTitle}>Signed out of staging</h1><p className={styles.description}>Your production account remains signed in.</p><ButtonLink href="/api/auth/staging/start" variant="primary">Return to staging</ButtonLink></section></main>;
    redirect('/api/auth/staging/start?'+new URLSearchParams({returnTo}));
  }
  // A failed or stale OAuth attempt must not strand an already signed-in user.
  if (await currentSiteUser()) {
    const target = new URL(returnTo, "http://local.invalid");
    redirect(target.pathname === "/access" || target.pathname.startsWith("/api/auth/") ? "/" : returnTo);
  }
  return <main className={styles.accessPage}><section className={styles.accessCard}>
    <span className={styles.icon}><ShieldCheck size={18}/></span>
    <h1 className={styles.accessTitle}>Private Analytics Workspace</h1>
    <p className={styles.description}>Sign in with your @elle-media.com Google account to continue.</p>
    {params.error && <p role="alert" className={styles.error}>{params.error === "domain" ? "Only verified @elle-media.com Google Workspace accounts can access this website." : params.error === "configuration" ? "Google sign-in is not configured. Please contact the administrator." : "Sign-in could not be completed. Please try again."}</p>}
    <AccessForm returnTo={returnTo} />
  </section></main>;
}
