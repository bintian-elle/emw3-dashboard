import { cache, Suspense, type ReactNode } from "react";
import Image from "next/image";
import { cookies, headers } from "next/headers";
import { ChevronRight } from "lucide-react";
import { SiteHomeLogo } from "@/components/brand/site-home-logo";
import { DashboardTopBarFrame } from "@/components/application/dashboard/dashboard-top-bar";
import topBar from "@/components/application/dashboard/account-header.module.css";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { getScriptLabProfile } from "@/lib/script-lab-account";
import { getScriptLabCompanyProfile } from "@/lib/script-lab-company-session";
import { type ScriptLabSection } from "@/lib/script-lab-navigation";
import { scriptLabCookie } from "@/lib/script-lab-host";
import { ScriptLabProjectPage } from "../ai-tools/script-lab/project-page";
import { CompanySessionSync } from "./company-session-sync";
import { CustomerLanguage } from "./customer-language";
import { CustomerAccount } from "./customer-account";
import styles from "./customer.module.css";

const loadAccount = cache(async () => {
  const company = await getScriptLabCompanyProfile((await headers()).get("host") ?? "");
  const profile = company ?? await getScriptLabProfile((await cookies()).get(scriptLabCookie)?.value).catch(() => null);
  return { company, profile };
});

async function AccountControls({ account }: { account: ReturnType<typeof loadAccount> }) {
  const { company, profile } = await account;
  return <>
    <CompanySessionSync signedIn={Boolean(company)} />
    <CustomerAccount email={profile?.email ?? null} name={profile?.name} picture={profile?.picture}
      company={Boolean(company)} />
  </>;
}

export function CustomerProjectLayout({ children }: { children: ReactNode }) {
  const account = loadAccount();
  return (
    <>
      <DashboardTopBarFrame
        label="Biceek workspace"
        brand={<>
          <SiteHomeLogo href="/script-lab" still />
          <span className={styles.brand}>
            <Image src="/brand/biceek-wordmark.png" alt="Biceek" width={300} height={56} unoptimized />
          </span>
        </>}
        controls={<div className={styles.controls}>
          <ThemeToggle collapsed />
          <CustomerLanguage />
          <Suspense fallback={null}><AccountControls account={account} /></Suspense>
        </div>}
      >
        <div className={`${topBar.breadcrumb} ${styles.breadcrumb}`}>
          <span className={topBar.crumb}><ChevronRight aria-hidden="true" /><span>AI Script Lab</span></span>
        </div>
      </DashboardTopBarFrame>
      {children}
    </>
  );
}

export function CustomerProjectPage({ section }: { section: ScriptLabSection }) {
  return <ScriptLabProjectPage visibility="public" customerProfile={loadAccount().then(value => value.profile)} section={section} />;
}
