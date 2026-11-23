"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { LocalizedText } from "@/lib/script-lab-project";
import type { RuleDimensionDefinition, RuleLayer } from "@/lib/script-lab-rules";
import styles from "./rules.module.css";

export function DimensionEditor({ endpoint, layer, t, onClose, onSaved }: {
  endpoint: string;
  layer: RuleLayer;
  t: (text: LocalizedText) => string;
  onClose: () => void;
  onSaved: (dimension: RuleDimensionDefinition) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "dimension", layer, code: values.get("code"), label: values.get("label") }),
      });
      if (response.ok) {
        const { dimension } = await response.json() as { dimension: RuleDimensionDefinition };
        onSaved(dimension);
      } else {
        setError(response.status === 409
          ? t(["This dimension code already exists.", "该维度编码已存在。"])
          : response.status === 403
            ? t(["Sign in again to save changes.", "请重新登录后保存。"])
            : t(["Could not save this dimension. Check the fields and try again.", "无法保存维度，请检查后重试。"]));
      }
    } catch {
      setError(t(["Could not reach the rule library. Please try again.", "无法连接规则库，请重试。"]));
    } finally {
      setSaving(false);
    }
  }

  return <Dialog.Root open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.dialog}>
        <Dialog.Close asChild><button className={styles.close} type="button" disabled={saving} aria-label={t(["Close", "关闭"])}><X size={18} /></button></Dialog.Close>
        <Dialog.Title>{t(["Add dimension", "新增维度"])}</Dialog.Title>
        <Dialog.Description>{t(["Use up to 32 letters, digits, hyphens or underscores for the code. Start with a letter.", "编码以英文字母开头，最多 32 位，可用英文字母、数字、连字符和下划线。"])}</Dialog.Description>
        <form className={styles.form} onSubmit={submit}>
          <label>{t(["Code", "编码"])}<input name="code" required maxLength={32} /></label>
          <label>{t(["Name", "名称"])}<input name="label" required maxLength={160} /></label>
          <button type="submit" className={styles.primary} disabled={saving}>{t(["Save dimension", "保存维度"])}</button>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
