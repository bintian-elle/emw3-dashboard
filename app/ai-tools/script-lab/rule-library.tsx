"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, History, Plus, Upload } from "lucide-react";
import { CustomerAccount } from "@/app/script-lab/customer-account";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { LocalizedText } from "@/lib/script-lab-project";
import { ruleFieldDefinitions, ruleLayers, ruleStatuses, type RuleDimension, type RuleLayer, type ScriptLabRule } from "@/lib/script-lab-rules";
import { exportVariablePool } from "@/lib/script-lab-variable-pool";
import { VariablePoolImportDialog } from "./variable-pool-import";
import { useScriptLabRules } from "./use-script-lab-rules";
import { newVariable, RuleEditor, type RuleEditorInput } from "./rule-editor";
import styles from "./rules.module.css";

type Translate = (pair: LocalizedText) => string;

export function RuleLibrary({ customer, canManage, sourceUrl, t }: { customer: boolean; canManage: boolean; sourceUrl?: string; t: Translate }) {
  const home = customer ? "/script-lab" : "/ai-tools/script-lab";
  const endpoint = `${home}/rules`;
  const [loginPrompt, setLoginPrompt] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [clipboardError, setClipboardError] = useState("");
  const { dimensions: allDimensions, rules, applyRuleChange, loadError, reload } = useScriptLabRules(endpoint);
  const [layer, setLayer] = useState<RuleLayer>("strategy");
  const [dimension, setDimension] = useState<RuleDimension | "">("");
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<RuleEditorInput | null>(null);
  const [notice, setNotice] = useState("");

  const dimensions = allDimensions.filter(item => item.layer === layer);
  const query = search.trim().toLowerCase();
  const visible = (rules ?? []).filter(rule =>
    dimensions.some(item => item.code === rule.dimension) && (!dimension || rule.dimension === dimension)
    && (!query || [rule.code, rule.label, rule.label_en, rule.notes].some(value => value.toLowerCase().includes(query))),
  );
  const dimensionLabel = (code: RuleDimension) => {
    const item = allDimensions.find(dimension => dimension.code === code);
    return item ? t(item.label) : code;
  };
  const ruleLabel = (rule: ScriptLabRule) => t(["en", "zh"]) === "en" && rule.label_en ? rule.label_en : rule.label;

  function open(next: RuleEditorInput) {
    if (!canManage) { setLoginPrompt(count => count + 1); return; }
    setEditor(next);
  }

  async function copyPool() {
    if (!rules) return;
    setClipboardError("");
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportVariablePool(allDimensions, rules), null, 2));
      setNotice(t(["JSON copied", "JSON 已复制"]));
    } catch {
      setNotice("");
      setClipboardError(t(["Could not copy the JSON. Try again.", "无法复制 JSON，请重试。"]));
    }
  }

  return (
    <section className={styles.library} aria-label={t(["Biceek rule library", "Biceek 规则库"])}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="group" aria-label={t(["Rule layers", "规则层"])}>
          {ruleLayers.map(item => (
            <button type="button" key={item.id} aria-pressed={layer === item.id} onClick={() => { setLayer(item.id); setDimension(""); }}>
              {t(item.title)}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <Link className={styles.secondary} href={`${home}/rule-history`}><History size={16} aria-hidden="true" />{t(["Change history", "修改历史"])}</Link>
          <button type="button" className={styles.primary} disabled={!rules} onClick={() => open(newVariable(dimension || dimensions[0].code))}><Plus size={16} aria-hidden="true" />{t(["Add rule", "新增规则"])}</button>
          <button type="button" className={styles.secondary} disabled={!rules} onClick={() => void copyPool()}>
            <Copy size={16} aria-hidden="true" />{t(["Export variable library JSON", "导出变量库 JSON"])}
          </button>
          <button type="button" className={styles.secondary} onClick={() => {
            if (canManage) setImportOpen(true);
            else setLoginPrompt(count => count + 1);
          }}><Upload size={16} aria-hidden="true" />{t(["Import new variables", "导入新变量"])}</button>
        </div>
      </div>
      {notice && <p className={styles.message} role="status">{notice}</p>}
      {clipboardError && <p className={styles.error} role="alert">{clipboardError}</p>}
      {!canManage && loginPrompt > 0 && <Card className={styles.surface}>
        <p className={styles.message}>{t(["Sign in to change or import rules.", "登录后可修改或导入规则。"])}</p>
        <CustomerAccount key={loginPrompt} email={null} autoOpen returnTo="/script-lab/rule-library" />
      </Card>}
      <Card className={styles.surface}>
        <div className={styles.filters}>
          <label>{t(["Dimension", "变量维度"])}
            <select aria-label={t(["Dimension", "变量维度"])} value={dimension} onChange={event => setDimension(event.target.value as RuleDimension | "")}>
              <option value="">{t(["All dimensions", "全部维度"])}</option>
              {dimensions.map(item => <option value={item.code} key={item.code}>{item.code} · {t(item.label)}</option>)}
            </select>
          </label>
          <label>{t(["Search rules", "搜索规则"])}
            <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t(["Code, label or notes", "编码、名称或备注"])} />
          </label>
          <button type="button" className={styles.secondary} onClick={reload}>
            {t(["Refresh", "刷新"])}
          </button>
        </div>
        {loadError && <p className={styles.message} role="alert">{t(["Could not load the rule library. Refresh to retry.", "规则库加载失败，请刷新重试。"])}</p>}
        {!rules && !loadError && <p className={styles.message} role="status">{t(["Loading rules…", "正在读取规则…"])}</p>}
        {rules && <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className="sr-only">{t(["Rules", "规则"])}</caption>
            <thead><tr>{[["Dimension", "维度"], ["Code", "编码"], ["Name", "名称"], ["Status", "状态"], ["Actions", "操作"]].map(label =>
              <th scope="col" key={label[0]}>{t(label as [string, string])}</th>)}</tr></thead>
            <tbody>
              {visible.map(rule => <tr key={rule.id}>
                <td>{dimensionLabel(rule.dimension)}</td><td><code>{rule.code}</code></td>
                <td><details className={styles.ruleDetails}>
                  <summary>{ruleLabel(rule)}</summary>
                  {rule.notes && <p>{rule.notes}</p>}
                  {ruleFieldDefinitions(rule.dimension).map(({ key, label }) => rule.fields[key] && <p key={key}>{t(label)} · {rule.fields[key]}</p>)}
                  {rule.default_selected && <p>{t(["Selected by default", "默认勾选"])}</p>}
                </details></td>
                <td><Badge variant={rule.status === "enabled" ? "success" : rule.status === "caution" ? "warning" : "secondary"}>{t(ruleStatuses.find(status => status.id === rule.status)?.label ?? ["Unknown", "未知"])}</Badge></td>
                <td><button className={styles.secondary} type="button" aria-label={`${t(["Edit", "编辑"])} ${rule.code}`} onClick={() => open({ id: rule.id, revision: rule.revision, input: rule })}>
                  {t(["Edit", "编辑"])}
                </button></td>
              </tr>)}
              {!visible.length && <tr><td colSpan={5}>{t(["No matching rules.", "没有匹配的规则。"])}</td></tr>}
            </tbody>
          </table>
        </div>}
        <p className={styles.message} role="status">{rules ? t([`${visible.length} rules`, `${visible.length} 条规则`]) : ""}</p>
      </Card>
      {sourceUrl && <a className={styles.source} href={sourceUrl}>
        {t(["Open source variable pool", "查看变量池原表"])}
      </a>}
      {importOpen && <VariablePoolImportDialog endpoint={endpoint} t={t} onClose={() => setImportOpen(false)}
        onImported={result => {
          reload();
          setImportOpen(false);
          setNotice(t([
            `Imported ${result.added} variables and ${result.dimensions} dimensions. Skipped ${result.skipped} existing variables.`,
            `已导入 ${result.added} 条变量和 ${result.dimensions} 个维度，跳过 ${result.skipped} 条重复变量。`,
          ]));
        }} />}
      {editor && <RuleEditor initialEditor={editor} endpoint={endpoint} dimensions={allDimensions} t={t}
        onClose={() => setEditor(null)} onSaved={(result, method) => {
          applyRuleChange(result);
          setNotice(method === "DELETE" ? t(["Rule deleted.", "规则已删除。"]) : t(["Rule saved.", "规则已保存。"]));
          setEditor(null);
        }} />}
    </section>
  );
}
