"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { SiteHomeLogo } from "@/components/brand/site-home-logo";
import { Card, CardContent } from "@/components/ui/card";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import styles from "../customer.module.css";

export function VerifyEmailForm() {
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    const token = window.location.hash.slice(1);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/script-lab/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token, password }),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => null);
        setError(t(message?.error || "Verification failed. Please try again.", "密码不正确，或验证链接无效、已过期。"));
        return;
      }
      window.history.replaceState(null, "", window.location.pathname);
      setVerified(true);
    } catch {
      setError(t("Could not connect. Please try again.", "连接失败，请重试。"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.verifyPage}>
      <SiteHomeLogo href="/script-lab" still />
      <Card>
        <CardContent className="pt-6">
          <h1 className={styles.dialogTitle}>{verified ? t("Email verified", "邮箱已验证") : t("Verify your email", "验证邮箱")}</h1>
          {verified ? (
            <p className={styles.dialogDescription} role="status">{t("You can now sign in to AI Script Lab with your registration password.", "现在可以使用注册时的密码登录 AI Script Lab。")}</p>
          ) : (
            <>
              <p className={styles.dialogDescription}>{t("Enter the password you chose at registration to verify your email.", "输入注册时设置的密码，完成邮箱验证。")}</p>
              <form className={styles.form} onSubmit={verify}>
                <label>{t("Password", "密码")}<input name="password" type="password" autoComplete="current-password" required minLength={12} maxLength={128} /></label>
                <p className={styles.formHint}>{t("Use at least 12 characters.", "请使用至少 12 个字符。")}</p>
                {error && <p className={styles.error} role="alert">{error}</p>}
                <button className={styles.primary} type="submit" disabled={busy}>{busy ? t("Verifying…", "正在验证…") : t("Verify email", "验证邮箱")}</button>
              </form>
            </>
          )}
          <Link className={styles.switchMode} href="/script-lab">{verified ? t("Go to Script Lab to sign in", "前往 AI Script Lab 登录") : t("Back to Script Lab", "返回 AI Script Lab")}</Link>
        </CardContent>
      </Card>
    </main>
  );
}
