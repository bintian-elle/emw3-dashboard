import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { SiteLanguageProvider } from "@/components/application/dashboard/site-language-provider";
import { scriptLabLanguageCookie } from "@/lib/script-lab-host";

export default async function ScriptLabLayout({ children }: { children: ReactNode }) {
  const language = (await cookies()).get(scriptLabLanguageCookie)?.value === "en" ? "en" : "zh";
  return <SiteLanguageProvider initialLanguage={language} persistence="script-lab">{children}</SiteLanguageProvider>;
}
