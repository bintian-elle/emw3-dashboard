"use client";

import { RiDriveLine } from "@remixicon/react";
import { ButtonLink } from "@/components/base/buttons/button";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";

export function TestingLocalizedText({ en, zh }: { en: string; zh: string }) {
  const { language } = useSiteLanguage();
  return language === "zh" ? zh : en;
}

export function TestingMaterialsLink({ href }: { href: string }) {
  const { language } = useSiteLanguage();
  return <ButtonLink href={href} target="_blank" rel="noopener noreferrer" variant="ghost" leadingIcon={RiDriveLine} aria-label={language === "zh" ? "在新标签页打开 Google Drive 测试资料" : "Open test supporting materials in Google Drive (opens in a new tab)"} className="mt-3 h-11 gap-2 rounded-xl bg-status-blue-background px-3 text-headline-medium text-status-blue-text hover:bg-status-blue-background hover:underline">{language === "zh" ? "Google Drive · 测试资料" : "Google Drive · Test materials"}</ButtonLink>;
}
