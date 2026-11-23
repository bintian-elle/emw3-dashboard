"use client";

import { useState, type FormEvent } from "react";
import { Upload, X } from "lucide-react";
import { Dialog } from "radix-ui";
import type { LocalizedText } from "@/lib/script-lab-project";
import type { VariablePoolImportResult } from "@/lib/script-lab-variable-pool";
import styles from "./rules.module.css";

export function VariablePoolImportDialog({ endpoint, t, onClose, onImported }: {
  endpoint: string;
  t: (text: LocalizedText) => string;
  onClose: () => void;
  onImported: (result: VariablePoolImportResult) => void;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const raw = String(new FormData(event.currentTarget).get("pool") ?? "");
    let pool: unknown;
    try {
      pool = JSON.parse(raw);
    } catch {
      setError(t(["The pasted text is not valid JSON.", "粘贴的内容不是有效的 JSON。"]));
      return;
    }
    setError("");
    setSaving(true);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "import", pool }),
      });
      if (response.ok) {
        onImported(await response.json() as VariablePoolImportResult);
        return;
      }
      const problem = await response.json().catch(() => ({})) as { row?: string };
      if (response.status === 400) {
        setError(problem.row
          ? t([`Check the JSON entry at ${problem.row}.`, `请检查 JSON 条目 ${problem.row}。`])
          : t(["Check that the referenced dimensions exist or are included in the JSON.", "请确认引用的维度已存在，或已随 JSON 一起提供。"]));
      } else if (response.status === 409) {
        setError(t(["An imported dimension belongs to a different layer in the rule library.", "导入的维度与规则库中的所属层级冲突。"]));
      } else if (response.status === 403) {
        setError(t(["Sign in again before importing.", "请重新登录后再导入。"]));
      } else if (response.status === 413) {
        setError(t(["Split this JSON into smaller batches.", "JSON 内容过大，请拆成较小批次导入。"]));
      } else {
        setError(t(["Could not import variables. Try again.", "导入失败，请重试。"]));
      }
    } catch {
      setError(t(["Could not import variables. Try again.", "导入失败，请重试。"]));
    } finally {
      setSaving(false);
    }
  }

  return <Dialog.Root open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className={styles.overlay} />
      <Dialog.Content className={styles.dialog}>
        <Dialog.Close className={styles.close} type="button" disabled={saving} aria-label={t(["Close", "关闭"])}><X size={18} /></Dialog.Close>
        <Dialog.Title>{t(["Import new variables", "导入新变量"])}</Dialog.Title>
        <Dialog.Description>{t([
          "Paste the variable library JSON. Existing variables with the same dimension and code are skipped.",
          "粘贴变量库 JSON。同一维度下编码已存在的变量会跳过。",
        ])}</Dialog.Description>
        <form className={styles.form} onSubmit={submit}>
          <label>{t(["Variable library JSON", "变量库 JSON"])}
            <textarea name="pool" rows={10} required readOnly={saving} spellCheck={false} placeholder={'{"dims":[…],"vars":[…],"seq":…}'} />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <button type="submit" className={styles.primary} disabled={saving}>
            <Upload size={15} aria-hidden="true" />{saving ? t(["Importing…", "正在导入…"]) : t(["Import", "导入"])}
          </button>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
