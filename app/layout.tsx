import {THEME_BOOTSTRAP} from '@/lib/theme-policy';
import {ThemeInitializer} from '@/components/application/theme/theme-toggle';
import { Suspense } from "react";
import { FloatingTableHeaders } from "@/components/application/dashboard/floating-table-headers";
import { currentSiteUser } from "@/lib/current-site-user";
import { readUserLanguage } from "@/lib/site-user-preferences";
import { SiteLanguageProvider } from "@/components/application/dashboard/site-language-provider";
import { AccountHeader } from "@/components/application/dashboard/account-header";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/styles/globals.css";

const geist = localFont({ src: "../public/fonts/nova-preview/geist-latin-wght-normal.woff2", variable: "--font-inter", weight: "100 900", display: "swap" });

export const metadata: Metadata = {
  title: "EMW3 Analytics",
  description: "AI-powered marketing analytics for Bluevua.",
  icons: { icon: "/icon.svg" },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true, "max-snippet": 0, "max-image-preview": "none" },
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await currentSiteUser();
  const language = user ? await readUserLanguage(user.sub).catch(() => "en" as const) : "en";
  return <html lang={language === "zh" ? "zh-CN" : "en"} className={geist.variable} suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:THEME_BOOTSTRAP}}/></head><body suppressHydrationWarning><SiteLanguageProvider initialLanguage={language}><ThemeInitializer/><Suspense><AccountHeader/></Suspense>{children}<FloatingTableHeaders/></SiteLanguageProvider></body></html>;
}
