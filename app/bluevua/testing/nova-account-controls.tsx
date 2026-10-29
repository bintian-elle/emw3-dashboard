"use client";

import { useSyncExternalStore } from "react";
import { Avatar, ToggleGroup, Tooltip } from "radix-ui";
import { LogOut, Moon, Sun } from "lucide-react";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { applyThemeWithTransition, useThemeMode } from "@/components/application/theme/theme-toggle";
import { NovaButton } from "./nova-preview-ui";
import styles from "./nova-account-controls.module.css";

const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;

/** Account actions for the shared Testing preview top bar. */
export function NovaAccountControls({ account }: { account: { name: string; email: string; picture?: string | null } | null }) {
  const { language, setLanguage, saving, error } = useSiteLanguage();
  const theme = useThemeMode();
  const ready = useSyncExternalStore(subscribe, clientReady, serverReady);

  if (!account) return null;

  const dark = theme === "dark";
  const themeLabel = dark
    ? (language === "zh" ? "切换浅色主题" : "Switch to light theme")
    : (language === "zh" ? "切换深色主题" : "Switch to dark theme");
  const signOutLabel = language === "zh" ? "退出登录" : "Sign out";
  const initials = account.name.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0]).join("").toLocaleUpperCase() || "?";

  return <div className={styles.right}>
    <div className={styles.appearance}>
      <Tooltip.Provider delayDuration={250}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <NovaButton type="button" variant="ghost" size="icon" className={styles.theme} aria-label={themeLabel} onClick={event => {
              const origin = event.clientX === 0 && event.clientY === 0 ? null : { x: event.clientX, y: event.clientY };
              void applyThemeWithTransition(dark ? "light" : "dark", { origin, element: event.currentTarget });
            }}>
              {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
            </NovaButton>
          </Tooltip.Trigger>
          <Tooltip.Portal><Tooltip.Content sideOffset={6} className={styles.tooltip}>{themeLabel}</Tooltip.Content></Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
      <div className={styles.languageContainer}>
        <ToggleGroup.Root type="single" value={language} disabled={!ready || saving} aria-label="Language / 语言" className={styles.language} onValueChange={value => { if (value === "en" || value === "zh") setLanguage(value); }}>
          <ToggleGroup.Item value="en" aria-label="English">EN</ToggleGroup.Item>
          <ToggleGroup.Item value="zh" aria-label="中文">中文</ToggleGroup.Item>
        </ToggleGroup.Root>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
    </div>
    <span className={styles.divider} aria-hidden="true" />
    <div className={styles.identity} aria-label={`${account.name}, ${account.email}`} title={`${account.name} · ${account.email}`}>
      <Avatar.Root className={styles.avatar} aria-hidden="true">
        {account.picture && <Avatar.Image src={account.picture} alt="" referrerPolicy="no-referrer" className={styles.avatarImage} />}
        <Avatar.Fallback>{initials}</Avatar.Fallback>
      </Avatar.Root>
      <div className={styles.copy}><strong>{account.name}</strong><span>{account.email}</span></div>
    </div>
    <form action="/api/auth/logout" method="post" className={styles.form}>
      <NovaButton type="submit" variant="ghost" className={styles.logout} aria-label={signOutLabel}><LogOut aria-hidden="true" /><span>{signOutLabel}</span></NovaButton>
    </form>
  </div>;
}
