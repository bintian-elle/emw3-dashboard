"use client";

import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import styles from "./ask-ai-button.module.css";

type Props = {
  onClick: () => void;
  open?: boolean;
  thinking?: boolean;
  disabled?: boolean;
  language?: "en" | "zh";
  label?: string;
};

export default function AskAIButton({ onClick, open = false, thinking = false, disabled = false, language = "en", label }: Props) {
  return (
    <Button type="button" variant="ghost" className={cx(styles.button, "h-auto shrink-0 rounded-full p-1 text-body-medium")} data-thinking={thinking} aria-expanded={open} aria-controls="testing-ai-panel" disabled={disabled} onClick={onClick}>
      <span className={styles.content}>
        <svg className={styles.sparkles} width="25" height="25" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
          <path d="M20 8C21.6 15 23 16.4 30 18C23 19.6 21.6 21 20 28C18.4 21 17 19.6 10 18C17 16.4 18.4 15 20 8Z" />
          <path d="M8 1C9 5.9 10.1 7 15 8C10.1 9 9 10.1 8 15C7 10.1 5.9 9 1 8C5.9 7 7 5.9 8 1Z" />
          <path d="M7 22C7.7 25.5 8.5 26.3 12 27C8.5 27.7 7.7 28.5 7 32C6.3 28.5 5.5 27.7 2 27C5.5 26.3 6.3 25.5 7 22Z" />
        </svg>
        <span>{thinking ? (language === "zh" ? "思考中…" : "Thinking…") : (label ?? (language === "zh" ? "询问 AI" : "Ask AI"))}</span>
      </span>
    </Button>
  );
}
