"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { scriptLabLanguageCookie } from "@/lib/script-lab-host";
import type { SiteLanguage } from "@/lib/site-language";
const LanguageContext = createContext<{ language: SiteLanguage; setLanguage: (language: SiteLanguage) => void; saving: boolean; error: string }>({ language: "en", setLanguage: () => {}, saving: false, error: "" });
export function SiteLanguageProvider({ initialLanguage, children, persistence = "account" }: {
  initialLanguage: SiteLanguage;
  children: ReactNode;
  persistence?: "account" | "script-lab";
}) {
  const pathname = usePathname();
  const [language, updateLanguage] = useState(initialLanguage);
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const publicScriptLab = pathname === "/script-lab" || pathname.startsWith("/script-lab/");
    if (persistence === "account" && publicScriptLab) return;
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language, pathname, persistence]);
  const setLanguage = (next: SiteLanguage) => {
    if (saving || next === language) return;
    if (persistence === "script-lab") {
      updateLanguage(next);
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${scriptLabLanguageCookie}=${next}; Path=/script-lab; Max-Age=31536000; SameSite=Lax${secure}`;
      return;
    }
    const previous = language;
    updateLanguage(next); setSaving(true); setError("");
    void fetch("/api/account/preferences", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ language: next }) })
      .then(response => { if (!response.ok) throw new Error("save_failed"); })
      .catch(() => { updateLanguage(previous); setError(previous === "zh" ? "语言偏好未能保存，请重试。" : "Language preference could not be saved. Please retry."); })
      .finally(() => setSaving(false));
  };
  return <LanguageContext.Provider value={{ language, setLanguage, saving, error }}>{children}</LanguageContext.Provider>;
}
export function useSiteLanguage() { return useContext(LanguageContext); }
