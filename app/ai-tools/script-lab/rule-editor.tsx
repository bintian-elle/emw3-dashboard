"use client";

import { useState, type FormEvent } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import type { LocalizedText } from "@/lib/script-lab-project";
import { ruleFieldDefinitions, ruleLayers, ruleStatuses, type RuleDimensionDefinition, type RuleInput, type ScriptLabRule } from "@/lib/script-lab-rules";
import styles from "./rules.module.css";

export type RuleEditorInput = { id?: string; revision?: number; input: RuleInput };
type RuleEditorResult = { rule?: ScriptLabRule; id?: string };

export function newVariable(dimension: string): RuleEditorInput {
  return { input: { dimension, code: "", label: "", label_en: "", notes: "", status: "enabled", default_selected: false, fields: {} } };
}

export function RuleEditor({ initialEditor, endpoint, dimensions, variableLabels, t, onClose, onSaved }: {
  initialEditor: RuleEditorInput;
  endpoint: string;
  dimensions: readonly RuleDimensionDefinition[];
  variableLabels?: boolean;
  t: (pair: LocalizedText) => string;
  onClose: () => void;
  onSaved: (result: RuleEditorResult, method: "POST" | "PATCH" | "DELETE") => void;
}) {
  const [editor, setEditor] = useState(initialEditor);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const editTitle = variableLabels ? t(["Edit variable", "编辑变量"]) : t(["Edit rule", "编辑规则"]);
  const addTitle = variableLabels ? t(["Add variable", "新增变量"]) : t(["Add rule", "新增规则"]);

  function update(input: Partial<RuleInput>) {
    setEditor(current => ({ ...current, input: { ...current.input, ...input } }));
  }

  async function save(method: "POST" | "PATCH" | "DELETE") {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editor.input, id: editor.id, revision: editor.revision }),
      });
      if (!response.ok) {
        setSaveError(response.status === 409
          ? t(["This code already exists or the rule changed. Close the editor and refresh the list.", "编码已存在，或规则已被更新。请关闭编辑窗口并刷新列表。"])
          : response.status === 403
            ? t(["Sign in again to save changes.", "请重新登录后保存。"])
            : t(["Could not save the rule. Check the fields and try again.", "未能保存规则，请检查字段后重试。"]));
        return;
      }
      const result = await response.json() as RuleEditorResult;
      onSaved(result, method);
    } catch {
      setSaveError(t(["Could not reach the rule library. Please try again.", "无法连接规则库，请重试。"]));
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(editor?.id ? "PATCH" : "POST");
  }

  return (
    <Dialog.Root open onOpenChange={next => { if (!next && !saving) onClose(); }}>
        <Dialog.Portal>
          <Dialog.Overlay className={styles.overlay} />
          <Dialog.Content className={styles.dialog}>
            <Dialog.Close asChild><button className={styles.close} type="button" disabled={saving} aria-label={t(["Close", "关闭"])}><X size={18} /></button></Dialog.Close>
            <Dialog.Title>{editor.id ? editTitle : addTitle}</Dialog.Title>
            <Dialog.Description>{confirmDelete
              ? t(["This rule will be removed from the library. Its prior content stays in change history.", "规则会从规则库移除，原内容会保留在修改历史中。"])
              : t(["Set the code, name and availability of this variable.", "设置这项变量的编码、名称和启用状态。"])}</Dialog.Description>
            {!confirmDelete && <form className={styles.form} onSubmit={submit}>
              <label>{t(["Dimension", "变量维度"])}<select aria-label={t(["Dimension", "变量维度"])} value={editor.input.dimension} onChange={event => update({ dimension: event.target.value, fields: {} })}>
                {ruleLayers.map(item => <optgroup key={item.id} label={t(item.title)}>
                  {dimensions.filter(dim => dim.layer === item.id).map(dim => <option key={dim.code} value={dim.code}>{dim.code} · {t(dim.label)}</option>)}
                </optgroup>)}
              </select></label>
              <label>{t(["Code", "编码"])}<input required maxLength={80} value={editor.input.code} onChange={event => update({ code: event.target.value })} /></label>
              <label>{t(["Name", "名称"])}<input required maxLength={160} value={editor.input.label} onChange={event => update({ label: event.target.value })} /></label>
              <label>{t(["Notes", "备注"])}<textarea maxLength={1200} rows={3} value={editor.input.notes} onChange={event => update({ notes: event.target.value })} /></label>
              <label>{t(["Status", "状态"])}<select aria-label={t(["Status", "状态"])} value={editor.input.status} onChange={event => {
                const status = ruleStatuses.find(item => item.id === event.target.value);
                if (status) update({ status: status.id });
              }}>{ruleStatuses.map(status => <option key={status.id} value={status.id}>{t(status.label)}</option>)}</select></label>
              {ruleFieldDefinitions(editor.input.dimension).map(({ key, label }) => (
                <label key={key}>{t(label)}<textarea maxLength={500} rows={2} value={editor.input.fields[key] ?? ""} onChange={event => update({ fields: { ...editor.input.fields, [key]: event.target.value } })} /></label>
              ))}
              <div className={styles.toolbar}>
                {editor.id && <button type="button" className={styles.danger} disabled={saving} onClick={() => { setConfirmDelete(true); setSaveError(""); }}>{t(["Delete rule", "删除规则"])}</button>}
                <button type="submit" className={styles.primary} disabled={saving}>{t(["Save rule", "保存规则"])}</button>
              </div>
            </form>}
            {confirmDelete && <div className={styles.actions}>
              <button type="button" className={styles.secondary} disabled={saving} onClick={() => setConfirmDelete(false)}>{t(["Cancel", "取消"])}</button>
              <button type="button" className={styles.danger} disabled={saving} onClick={() => void save("DELETE")}>{t(["Confirm deletion", "确认删除"])}</button>
            </div>}
            {saveError && <p className={styles.error} role="alert">{saveError}</p>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
  );
}
