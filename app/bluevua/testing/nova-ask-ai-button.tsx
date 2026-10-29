"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { motion, useReducedMotion, type MotionProps } from "motion/react";
import { Sparkles } from "lucide-react";
import { NovaButton } from "./nova-preview-ui";
import styles from "./nova-ask-ai-button.module.css";

// Adapted from the reference dashboard's Magic UI Shiny Button (MIT).
const MotionButton = motion.create(NovaButton);

type NovaAskAiButtonProps = Omit<ComponentProps<"button">, keyof MotionProps> & Omit<MotionProps, "children"> & { children?: ReactNode };

export function NovaAskAiButton({ children, disabled, className, ...props }: NovaAskAiButtonProps) {
  const reducedMotion = useReducedMotion();
  const gradientId = useId();
  const animated = !reducedMotion && !disabled;
  return <MotionButton
    {...props}
    type="button"
    disabled={disabled}
    className={[styles.shiny, className].filter(Boolean).join(" ")}
    initial={false}
    animate={animated ? { "--ai-border-angle": ["0deg", "360deg"] } : { "--ai-border-angle": "0deg" }}
    transition={animated ? { type: "spring", stiffness: 400, damping: 28, "--ai-border-angle": { duration: 5, repeat: Infinity, ease: "linear" } } : { duration: 0 }}
    whileHover={animated ? { scale: 1.025 } : undefined}
    whileTap={animated ? { scale: 0.97 } : undefined}
    data-motion={animated ? "animated" : "reduced"}
  >
    <span className={styles.content}>
      <motion.span className={styles.icon} aria-hidden="true" animate={animated ? { scale: [1, 1.15, 1] } : { scale: 1 }} transition={animated ? { duration: 2.4, repeat: Infinity, ease: "linear" } : { duration: 0 }}>
        <Sparkles stroke={`url(#${gradientId})`}><defs><linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" className={styles.cyan}/><stop offset="50%" className={styles.purple}/><stop offset="100%" className={styles.pink}/></linearGradient></defs></Sparkles>
      </motion.span>
      <span>{children}</span>
    </span>
  </MotionButton>;
}
