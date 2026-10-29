import { ShieldCheck } from "lucide-react";
import { AccessForm } from "./access-form";
import { safeReturnPath } from "@/lib/site-auth";
import styles from "../workspace-entry.module.css";

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[]; error?: string }> }) {
  const params = await searchParams;
  return <main className={styles.accessPage}><section className={styles.accessCard}>
    <span className={styles.icon}><ShieldCheck size={18}/></span>
    <h1 className={styles.accessTitle}>Private Analytics Workspace</h1>
    <p className={styles.description}>Sign in with your @elle-media.com Google account to continue.</p>
    {params.error && <p role="alert" className={styles.error}>{params.error === "domain" ? "Only verified @elle-media.com Google Workspace accounts can access this website." : params.error === "configuration" ? "Google sign-in is not configured. Please contact the administrator." : "Sign-in could not be completed. Please try again."}</p>}
    <AccessForm returnTo={safeReturnPath(Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo)} />
  </section></main>;
}
