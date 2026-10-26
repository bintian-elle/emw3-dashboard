import { Suspense } from "react";
import { FloatingTableHeaders } from "@/components/application/dashboard/floating-table-headers";
import { currentSiteUser } from "@/lib/current-site-user";
import { readUserLanguage } from "@/lib/site-user-preferences";
import { SiteLanguageProvider } from "@/components/application/dashboard/site-language-provider";
import { AccountHeader } from "@/components/application/dashboard/account-header";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-source", subsets: ["latin"] });

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
  return <html lang={language === "zh" ? "zh-CN" : "en"} className={`${inter.variable} ${mono.variable}`} suppressHydrationWarning><body suppressHydrationWarning><SiteLanguageProvider initialLanguage={language}><Suspense><AccountHeader/></Suspense>{children}<FloatingTableHeaders/></SiteLanguageProvider></body></html>;
}
