"use client";

import { useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, Dialog } from "radix-ui";
import { ArrowRight, LogOut, UserRound, X } from "lucide-react";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { SCRIPT_LAB_COMPANY_ORIGIN, SCRIPT_LAB_PUBLIC_HOST } from "@/lib/script-lab-host";
import accountStyles from "../bluevua/testing/nova-account-controls.module.css";
import styles from "./customer.module.css";

export function CustomerAccount({ email, name, picture, company = false, autoOpen = false, returnTo }: {
  email: string | null;
  name?: string;
  picture?: string;
  company?: boolean;
  autoOpen?: boolean;
  returnTo?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const [open, setOpen] = useState(autoOpen);
  const [register, setRegister] = useState(false);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(action: "login" | "register" | "logout", details?: FormData) {
    setBusy(true);
    setError("");
    try {
      if (action === "logout" && company && window.location.hostname === SCRIPT_LAB_PUBLIC_HOST) {
        const dashboard = await fetch(`${SCRIPT_LAB_COMPANY_ORIGIN}/api/script-lab/company-logout`, {
          method: "POST", credentials: "include",
        });
        if (!dashboard.ok) throw new Error("Company sign-out failed");
      }
      const response = await fetch("/script-lab/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, company: action === "logout" && company, email: details?.get("email"), password: details?.get("password"), passwordConfirmation: details?.get("passwordConfirmation") }),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => null);
        setError(t(message?.error || "Something went wrong. Please try again.", "操作失败，请检查输入或稍后重试。"));
        return;
      }
      if (action === "register") {
        setSent(true);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError(t("Could not connect. Please try again.", "连接失败，请重试。"));
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const details = new FormData(event.currentTarget);
    if (register && details.get("password") !== details.get("passwordConfirmation")) {
      setError(t("The passwords do not match.", "两次输入的密码不一致。"));
      return;
    }
    void submit(register ? "register" : "login", details);
  }

  if (email) return (
    <div className={styles.account}>
      <div className={styles.profile} aria-label={name && name !== email ? `${name}, ${email}` : email} title={email}>
        <Avatar.Root className={accountStyles.avatar} aria-hidden="true">
          {picture && <Avatar.Image src={picture} referrerPolicy="no-referrer" className={accountStyles.avatarImage} />}
          <Avatar.Fallback>{Array.from((name || email).trim())[0]?.toUpperCase() || "?"}</Avatar.Fallback>
        </Avatar.Root>
        <span><strong>{name || email}</strong>{name && name !== email && <small>{email}</small>}</span>
      </div>
      <button type="button" className={`${styles.secondary} ${accountStyles.logout}`} disabled={busy}
        aria-label={t("Sign out", "退出登录")} title={t("Sign out", "退出登录")} onClick={() => void submit("logout")}>
        <LogOut size={15} aria-hidden="true" /><span>{t("Sign out", "退出登录")}</span>
      </button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </div>
  );

  return (
    <Dialog.Root open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) { setError(""); setRegister(false); setSent(false); }
    }}>
      <div className={styles.account}>
        <span className={styles.guest}><span aria-hidden="true" />{t("Not signed in", "未登录")}</span>
        <Dialog.Trigger className={styles.primary}><UserRound size={15} aria-hidden="true" /> {t("Sign in", "登录")}</Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={styles.dialog}>
          <Dialog.Close className={styles.close} aria-label={t("Close", "关闭")}><X size={20} /></Dialog.Close>
          <Dialog.Title className={styles.dialogTitle}>{sent ? t("Check your email", "请查收邮件") : register ? t("Create an account", "注册账号") : t("Sign in to Script Lab", "登录 AI Script Lab")}</Dialog.Title>
          <Dialog.Description className={styles.dialogDescription}>
            {sent ? t("If this address is eligible, a verification link will arrive shortly. Open it to verify your email.", "如果该邮箱可以注册，你将收到验证链接。打开链接即可验证邮箱。") : register ? t("Choose a password and confirm it to receive a verification email.", "设置并确认密码后，我们会发送邮箱验证邮件。") : t("Use your verified email and password to sign in.", "请用已验证的邮箱和密码登录。")}
          </Dialog.Description>
          {!register && !sent && <a className={`${styles.secondary} ${styles.google}`} href={`/script-lab/auth/google?returnTo=${encodeURIComponent(returnTo ?? pathname ?? "/script-lab")}`}>
            <span>{t("Sign in with Google", "使用 Google 登录")}</span>
            <small>{t("Account from elle-media.com only", "仅限 elle-media.com 公司账号")}</small>
          </a>}
          {!sent && <form className={styles.form} onSubmit={onSubmit}>
            <label>{t("Email", "邮箱")}<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
            <label>{t("Password", "密码")}<input key={String(register)} name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={12} maxLength={128} /></label>
            {register && <>
              <label>{t("Confirm password", "确认密码")}<input name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label>
              <p className={styles.formHint}>{t("Use at least 12 characters.", "请使用至少 12 个字符。")}</p>
            </>}
            {error && <p role="alert" className={styles.error}>{error}</p>}
            <button type="submit" className={styles.primary} disabled={busy}>{busy ? t("Please wait…", "请稍候…") : register ? t("Send verification email", "发送验证邮件") : t("Sign in", "登录")}<ArrowRight size={16} aria-hidden="true" /></button>
          </form>}
          <button type="button" className={styles.switchMode} disabled={busy} onClick={() => { setRegister(!register); setSent(false); setError(""); }}>
            {register ? t("Already have an account? Sign in", "已有账号？登录") : t("New here? Create an account", "还没有账号？注册")}
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
