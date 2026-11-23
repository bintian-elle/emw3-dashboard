"use client";

import { ToggleGroup } from "radix-ui";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import styles from "../bluevua/testing/nova-account-controls.module.css";

export function CustomerLanguage() {
  const { language, setLanguage } = useSiteLanguage();

  return (
    <ToggleGroup.Root
      type="single"
      value={language}
      aria-label="Language / 语言"
      className={styles.language}
      onValueChange={(value) => { if (value === "en" || value === "zh") setLanguage(value); }}
    >
      <ToggleGroup.Item value="en" aria-label="English" lang="en">EN</ToggleGroup.Item>
      <ToggleGroup.Item value="zh" aria-label="中文" lang="zh-CN">中文</ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
