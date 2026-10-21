"use client";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { Button } from "@/components/base/buttons/button";
import { RiLogoutBoxRLine } from "@remixicon/react";

export function AccountActions() {
  const { language } = useSiteLanguage();
  return <form action="/api/auth/logout" method="post"><Button type="submit" size="small" variant="ghost" leadingIcon={RiLogoutBoxRLine}>{language === "zh" ? "退出登录" : "Sign out"}</Button></form>;
}
