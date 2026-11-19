"use client";

import type { ReactNode, Ref } from "react";
import { ChevronRight, History, Plus, Sparkles } from "lucide-react";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { NovaButton } from "./nova-preview-ui";
import styles from "./nova-chat.module.css";

export function NovaChatHeader({ title, onCollapse, onHistory, onNew, collapseRef, historyOpen, historyDisabled, newDisabled }: {
  title: ReactNode;
  onCollapse: () => void;
  onHistory: () => void;
  onNew: () => void;
  collapseRef?: Ref<HTMLButtonElement>;
  historyOpen: boolean;
  historyDisabled?: boolean;
  newDisabled?: boolean;
}) {
  const { language } = useSiteLanguage();
  const zh = language === "zh";
  const collapse = zh ? "收起 Ask AI" : "Collapse Ask AI";
  const history = zh ? "历史对话" : "Conversation history";
  return <header className={styles.header}>
    <div className={styles.headerGroup}>
      <NovaButton ref={collapseRef} variant="ghost" size="icon" className={styles.collapse} aria-label={collapse} title={collapse}
        aria-expanded onClick={onCollapse}><ChevronRight aria-hidden /></NovaButton>
      <span className={styles.aiMark}><Sparkles aria-hidden /></span>
      {title}
    </div>
    <div className={styles.headerActions}>
      <NovaButton variant="ghost" size="icon" aria-label={history} title={history} aria-expanded={historyOpen}
        onClick={onHistory} disabled={historyDisabled}><History aria-hidden /></NovaButton>
      <NovaButton variant="ghost" size="sm" disabled={newDisabled} onClick={onNew}>
        <Plus aria-hidden />{zh ? "新对话" : "New chat"}
      </NovaButton>
    </div>
  </header>;
}
