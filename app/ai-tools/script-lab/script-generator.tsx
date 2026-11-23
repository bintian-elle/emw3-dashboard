"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, Pencil, Plus, Sparkles, X } from "lucide-react";
import { Dialog, DropdownMenu } from "radix-ui";
import { CustomerAccount } from "@/app/script-lab/customer-account";
import { Card } from "@/components/ui/card";
import type { LocalizedText } from "@/lib/script-lab-project";
import { dimensionParticipatesInCombinations, ruleCanBeSelected, ruleLayers, ruleStatuses, type RuleDimension, type RuleLayer, type RuleStatus, type ScriptLabRule } from "@/lib/script-lab-rules";
import { CascadeConnections, type CascadeSegment } from "./cascade-connections";
import { DimensionEditor } from "./dimension-editor";
import { newVariable, RuleEditor, type RuleEditorInput } from "./rule-editor";
import { scriptLabSectionPath } from "@/lib/script-lab-navigation";
import type { VideoJob } from "@/lib/script-lab-video-jobs";
import { VideoJobProgress } from "./video-job-progress";
import { useVideoJobs, videoEndpoint } from "./use-video-jobs";
import { useGeneratorSelection, useGeneratorStorage, writeGeneratorStorage } from "./use-generator-selection";
import { useScriptLabRules } from "./use-script-lab-rules";
import rulesStyles from "./rules.module.css";
import styles from "./script-generator.module.css";

const generatorConnections: CascadeSegment[] = [
  { from: '[data-connection="layer"][aria-pressed="true"]', to: '[data-connection="dimensions"]', toOffset: 44 },
  { from: '[data-connection="dimension"][aria-pressed="true"]', to: '[data-connection="picker"]', toOffset: 44 },
  { from: '[data-connection="picker"]', to: '[data-connection="preview"]', fromOffset: 44, toOffset: 62 },
];

type Translate = (pair: LocalizedText) => string;

export function ScriptGenerator({ customer, canManage, selectionScope, pending = false, t }: {
  customer: boolean;
  canManage: boolean;
  selectionScope: string;
  pending?: boolean;
  t: Translate;
}) {
  const trendId = useSearchParams().get("trend");
  const endpoint = customer ? "/script-lab/rules" : "/ai-tools/script-lab/rules";
  const library = useScriptLabRules(endpoint, { enabled: !pending, cacheScope: selectionScope });
  const detailsReady = useDeferredValue(library.rules !== null, false);
  const details = detailsReady ? library.rules : null;
  const canEdit = !pending && detailsReady;

  const [loginPrompt, setLoginPrompt] = useState(0);
  const [editor, setEditor] = useState<RuleEditorInput | "dimension" | null>(null);
  const [notice, setNotice] = useState("");
  const [preparing, setPreparing] = useState(false);
  const [prepared, setPrepared] = useState<{ key: string; error?: string }>();
  const [excludedCount, setExcludedCount] = useState(0);
  const [submitted, setSubmitted] = useState<VideoJob>();
  const jobKey = `emw3:script-lab:biceek:latest-video:${customer ? "public" : "internal"}:${selectionScope}`;
  const latestJobId = useGeneratorStorage(jobKey);
  const jobs = useVideoJobs(customer, !pending, canManage ? selectionScope : undefined);
  const stopEndpoint = canManage ? videoEndpoint(customer) : undefined;
  const job = jobs.find(item => item.id === latestJobId) ?? (submitted?.id === latestJobId ? submitted : undefined);
  const inProgress = job?.status === "queued" || job?.status === "running";
  const queue = jobs.filter(item => (item.status === "queued" || item.status === "running") && item.id !== job?.id)
    .sort((a, b) => a.queue_position - b.queue_position);
  const resultUrl = job?.status === "completed" && job.first_script_id
    ? `${scriptLabSectionPath("candidates", customer)}?${new URLSearchParams({ batch: job.batch_id, script: job.first_script_id })}`
    : undefined;
  const [statusError, setStatusError] = useState("");
  const [savingStatuses, setSavingStatuses] = useState<ReadonlySet<string>>(new Set());

  function openEditor(next: RuleEditorInput | "dimension") {
    if (!canManage) {
      setLoginPrompt(count => count + 1);
      return;
    }
    setNotice("");
    setEditor(next);
  }
  const cascadeRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<RuleLayer>("strategy");
  const [mobileStep, setMobileStep] = useState<"layers" | "dimensions" | "variables">("layers");
  const [dimension, setDimension] = useState<RuleDimension>("MKT");
  const [search, setSearch] = useState("");
  const index = library.rules ?? [];
  const dimensions = library.dimensions;
  const countReady = library.rules !== null && !pending;
  const [selected, setSelected] = useGeneratorSelection(selectionScope, new Set(
    index.filter(rule => rule.default_selected && ruleCanBeSelected(rule)).map(rule => rule.id),
  ));
  const groups = dimensions.map(dimension => ({
    ...dimension,
    rules: index.filter(rule => rule.dimension === dimension.code),
  }));
  const currentGroups = groups.filter(group => group.layer === layer);
  const currentLayer = ruleLayers.find(item => item.id === layer)!;
  const activeDimension = currentGroups.find(group => group.code === dimension);
  const selectedRules = (details ?? []).filter(rule => selected.has(rule.id) && ruleCanBeSelected(rule));
  const query = search.trim().toLowerCase();
  const label = (rule: ScriptLabRule) => t(["en", "zh"]) === "en" && rule.label_en ? rule.label_en : rule.label;
  const count = (items: typeof index) => items.filter(rule => selected.has(rule.id) && ruleCanBeSelected(rule)).length;
  const fraction = (items: typeof index) => countReady ? `${count(items)}/${items.length}` : "—";
  const visibleGroups = currentGroups.filter(group => group.code === dimension).map(group => ({
    ...group,
    visible: (details ?? []).filter(rule => rule.dimension === group.code && [rule.code, rule.label, rule.label_en, rule.notes].some(value => value.toLowerCase().includes(query))),
  })).filter(group => group.visible.length > 0);
  const factors = groups.filter(dimensionParticipatesInCombinations).map(group => ({ ...group, count: count(group.rules) })).filter(group => group.count > 0);
  const formula = factors.map(group => `${t(group.label)} ${group.count}`).join(" × ");
  const combinations = factors.length ? factors.reduce((total, group) => total * group.count, 1) : 0;
  const varyingLabels = factors.filter(group => group.count > 1).map(group => t(group.label));
  const constraints = count(groups.filter(group => group.layer === "constraints").flatMap(group => group.rules));

  function toggle(items: typeof index, checked: boolean) {
    setSelected(current => {
      const next = new Set(current);
      for (const rule of items.filter(ruleCanBeSelected)) {
        if (checked) next.add(rule.id);
        else next.delete(rule.id);
      }
      return next;
    });
  }

  function applySavedVariable(rule: ScriptLabRule, created = false) {
    library.applyRuleChange({ rule });
    if (!ruleCanBeSelected(rule)) setSelected(current => new Set([...current].filter(id => id !== rule.id)));
    else if (created && rule.default_selected) toggle([rule], true);
  }

  async function changeStatus(rule: ScriptLabRule, status: RuleStatus) {
    if (rule.status === status || savingStatuses.has(rule.id)) return;
    if (!canManage) {
      setLoginPrompt(count => count + 1);
      return;
    }

    setSavingStatuses(current => new Set(current).add(rule.id));
    setStatusError("");
    setNotice("");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, status }),
      });
      if (!response.ok) {
        if (response.status === 409) library.reload();
        setStatusError(response.status === 409
          ? t(["This variable changed. The list is refreshing. Please try again.", "这条变量已被更新，列表正在刷新，请重试。"])
          : response.status === 403
            ? t(["Sign in again to change the variable status.", "请重新登录后更改变量状态。"])
            : t(["Could not change the variable status.", "无法更改变量状态。"]));
        return;
      }
      const { rule: saved } = await response.json() as { rule: ScriptLabRule };
      applySavedVariable(saved);
      setNotice(t(["Status updated.", "状态已更新。"]));
    } catch {
      setStatusError(t(["Could not change the variable status.", "无法更改变量状态。"]));
    } finally {
      setSavingStatuses(current => new Set([...current].filter(id => id !== rule.id)));
    }
  }

  const selectionKey = selectedRules.map(rule => `${rule.id}:${rule.revision}`).join(",");
  const currentPreparation = prepared?.key === selectionKey ? prepared : undefined;

  async function prepareParameters() {
    if (preparing || inProgress || !combinations) return;
    if (!canManage) {
      setLoginPrompt(count => count + 1);
      return;
    }
    setPreparing(true);
    setPrepared(undefined);
    setExcludedCount(0);
    try {
      const response = await fetch(videoEndpoint(customer), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_rule_ids: selectedRules.map(rule => rule.id), trend_id: trendId }),
      });
      const result = await response.json() as { error?: string; job?: VideoJob; excluded_count?: number };
      setExcludedCount(result.excluded_count ?? 0);
      if (response.ok && result.job) {
        setSubmitted(result.job);
        writeGeneratorStorage(jobKey, result.job.id);
      } else {
        if (result.error === "selection_changed") library.reload();
        setPrepared({ key: selectionKey, error: result.error ?? "unavailable" });
      }
    } catch {
      setPrepared({ key: selectionKey, error: "unavailable" });
    } finally {
      setPreparing(false);
    }
  }

  const preparationMessages: Record<string, LocalizedText> = {
    pain_matching: ["No combination matches the selected pain-point rules. Check the selling points, evidence, hooks and scenes.", "没有组合符合选中的痛点规则，请核对主卖点、证据、Hook 和场景。"],
    selection_changed: ["The rules have changed. Review your selections and try again.", "规则已更新，请核对勾选后重试。"],
    too_many_combinations: ["Reduce the number of combinations and try again.", "组合数超过单次准备上限，请减少勾选后重试。"],
    trend_unavailable: ["This reference is no longer available. Return to trends to choose another.", "该创意参考已过期，请回到流行趋势重新选择。"],
  };

  function bulkControl(items: typeof index, name: string) {
    const available = items.filter(ruleCanBeSelected);
    const checked = available.length > 0 && count(available) === available.length;
    const mixed = !checked && count(available) > 0;
    return <label className={styles.bulk}>
      <input type="checkbox" aria-label={name} checked={checked} disabled={!canEdit || !available.length}
        ref={input => { if (input) input.indeterminate = mixed; }}
        onChange={event => toggle(available, event.target.checked)} />
      {t(["Select all", "全选"])}
    </label>;
  }

  const previewTitle = t(["Preview script combinations", "预生成剧本组合"]);
  const countLabel = countReady ? t([`${combinations.toLocaleString("en")} possible combinations`, `${combinations.toLocaleString("zh")} 个待筛选组合`]) : t(["Combination count · —", "预计组合数 · —"]);
  const preview = <>
      <div aria-live="polite" className={styles.stack}>
        <p className={styles.formula}>
          {!countReady ? countLabel : factors.length > 0
            ? `${formula} = ${countLabel}`
            : t(["Select variables to see a combination count.", "勾选变量后可查看组合数。"])}
        </p>
        {countReady && <div className={styles.summary}>
          <p>{t(["During pre-generation, rules will fill in dimensions you leave unselected.", "未勾选的维度将在预生成时按规则补齐。"])}</p>

          <p>{t([
            `Allowed this round: ${varyingLabels.join(", ") || "—"}`,
            `本轮可替换：${varyingLabels.join("、") || "—"}`,
          ])}</p>
          <p>{t([
            `Active constraints: ${constraints}`,
            `启用的约束：${constraints} 条`,
          ])}</p>
        </div>}
      </div>
      <div className={styles.actions}>
        {resultUrl ? <>
          <Link className={rulesStyles.primary} href={resultUrl}>{t(["View generated scripts", "查看已生成剧本"])}</Link>
          <button type="button" className={rulesStyles.secondary} onClick={() => writeGeneratorStorage(jobKey, "")}>
            {t(["Start another batch", "开启新批次"])}
          </button>
        </> : <button type="button" className={rulesStyles.primary} disabled={!canEdit || preparing || inProgress || !combinations} onClick={() => void prepareParameters()}>
          <Sparkles size={16} aria-hidden="true" />{preparing ? t(["Submitting…", "正在提交…"]) : t(["AI pre-generate", "AI预生成"])}
        </button>}
        {currentPreparation?.error && <p role="alert" className={rulesStyles.error}>{t(
          preparationMessages[currentPreparation.error] ?? ["Could not submit generation. Try again.", "无法提交生成，请重试。"],
        )}</p>}
      </div>
      {excludedCount > 0 && <p role="status" className={styles.muted}>{t([
        `${excludedCount} combinations were excluded before joining the queue because they conflict with pain-point rules.`,
        `${excludedCount} 个组合与痛点规则不匹配，已在排队前筛除。`,
      ])}</p>}
      {job && <div aria-live="polite"><VideoJobProgress key={job.id} job={job} stopEndpoint={stopEndpoint} t={t} /></div>}
      {!!queue.length && <section className={styles.stack} aria-label={t(["Generation queue", "生成队列"])}>
        <h3>{t(["Generation queue", "生成队列"])}</h3>
        {queue.map(item => <div key={item.id}>
          <p>{item.requested_name} · {t(item.combination)}</p>
          <VideoJobProgress job={item} stopEndpoint={stopEndpoint} t={t} />
        </div>)}
      </section>}
  </>;

  function openLayer(next: RuleLayer) {
    setLayer(next);
    setDimension(dimensions.find(item => item.layer === next)!.code);
    setSearch("");
    setMobileStep("dimensions");
  }

  return <>
    {trendId && <p className={styles.trendNotice} role="status">{t(["Trend reference selected. It will be sent with your current rules.", "已带入趋势参考，将随当前规则一起提交。"])} <Link href={scriptLabSectionPath("generator", customer)}>{t(["Remove", "移除"])}</Link></p>}
    <div ref={cascadeRef} className={styles.cascade} data-mobile-step={mobileStep}>
    <CascadeConnections container={cascadeRef} selection={`${layer}/${dimension}`} segments={generatorConnections} />
    {mobileStep !== "layers" && <nav className={styles.mobilePath} aria-label={t(["Current location", "当前位置"])}>
      <ol>
        <li>
          <button type="button" onClick={() => { setSearch(""); setMobileStep("layers"); }}>{t(["Rule layers", "规则层"])}</button>
        </li>
        <li>
          <ChevronRight size={14} aria-hidden="true" />
          {mobileStep === "dimensions"
            ? <span aria-current="step">{t(currentLayer.title)}</span>
            : <button type="button" onClick={() => { setSearch(""); setMobileStep("dimensions"); }}>{t(currentLayer.title)}</button>}
        </li>
        {mobileStep === "variables" && activeDimension && <li>
          <ChevronRight size={14} aria-hidden="true" />
          <span aria-current="step">{t(activeDimension.label)}</span>
        </li>}
      </ol>
    </nav>}
    <Card className={`${styles.panel} ${styles.layers}`}>
      <h2>{t(["Rule layers", "规则层"])}</h2>
      <div className={styles.choices} role="group" aria-label={t(["Rule layers", "规则层"])}>
        {ruleLayers.map(item => {
          const entries = groups.filter(group => group.layer === item.id).flatMap(group => group.rules);
          return <button key={item.id} type="button" data-connection="layer" aria-pressed={layer === item.id} onClick={() => openLayer(item.id)}>
            <span>{t(item.title)}</span>
            <span className={styles.choiceDetail}><span className={styles.muted}>{fraction(entries)}</span><ChevronRight size={15} aria-hidden="true" /></span>
          </button>;
        })}
      </div>
    </Card>
    <Card className={`${styles.panel} ${styles.dimensions}`} data-connection="dimensions">
      <div className={styles.panelHeading}>
        <h2>{t(currentLayer.title)}{t([" Dimensions", "维度"])}</h2>
        {bulkControl(currentGroups.flatMap(group => group.rules), t(["Select all dimensions", "全选维度"]))}
      </div>
      <div className={styles.choices} role="group" aria-label={t(["Dimensions", "选择维度"])}>
        {currentGroups.map(group => (
          <button type="button" key={group.code} data-connection="dimension" aria-pressed={dimension === group.code}
            onClick={() => { setSearch(""); setDimension(group.code); setMobileStep("variables"); }}>
            <span>{t(group.label)}</span>
            <span className={styles.choiceDetail}><span className={styles.muted}>{fraction(group.rules)}</span><ChevronRight size={15} aria-hidden="true" /></span>
          </button>
        ))}
      </div>
      <button type="button" className={rulesStyles.secondary} disabled={!canEdit} onClick={() => openEditor("dimension")}>
        <Plus size={15} aria-hidden="true" />{t(["Add dimension", "新增维度"])}
      </button>
    </Card>
    <Card className={`${styles.panel} ${styles.picker}`} data-connection="picker">
      <div className={styles.panelHeading}>
        {activeDimension && <h2>{t(activeDimension.label)}{t([" variables", "变量"])}</h2>}
        {bulkControl(visibleGroups.flatMap(group => group.visible), t(["Select all visible variables", "全选当前显示的变量"]))}
      </div>
      <div className={rulesStyles.filters}>
        <input type="search" disabled={!canEdit} value={search}
          aria-label={t(["Search variables", "搜索变量"])}
          placeholder={t(["Search by code, name or note", "搜索编码、名称或备注"])}
          onChange={event => setSearch(event.target.value)} />
      </div>
      {!detailsReady && (library.loadError ? <div className={rulesStyles.toolbar}>
        <p role="alert">{t(["Could not load the variable library.", "变量库加载失败。"])}</p>
        <button type="button" className={rulesStyles.secondary} onClick={library.reload}>{t(["Retry", "重试"])}</button>
      </div> : <p role="status" className={styles.muted}>{t(["Loading variables…", "正在读取变量…"])}</p>)}
      {detailsReady && visibleGroups.length === 0 && <p role="status" className={styles.muted}>{query
        ? t(["No matching variables.", "没有匹配的变量。"])
        : t(["This dimension has no variables yet.", "这个维度还没有变量。"])}</p>}
      {visibleGroups.map(group => (
        <fieldset key={group.code} className={styles.group}>
          <legend>{t(group.label)} <span className={styles.muted}>{fraction(group.rules)}</span></legend>
          <div className={styles.variables}>
            {group.visible.map(rule => {
              const status = ruleStatuses.find(item => item.id === rule.status)!;
              return <div key={rule.id} className={styles.variable}>
                <label className={styles.variableBody}>
                  <input type="checkbox" checked={selected.has(rule.id) && ruleCanBeSelected(rule)} disabled={!ruleCanBeSelected(rule)}
                    onChange={event => toggle([rule], event.target.checked)} />
                  <span className={styles.variableText}>
                    <span className={styles.variableTitle}>
                      <code>{rule.code}</code><strong>{label(rule)}</strong>
                    </span>
                    {rule.notes && <span className={styles.muted}>{rule.notes}</span>}
                  </span>
                </label>
                <div className={styles.variableActions}>
                  <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger className={styles.statusTrigger} data-status={rule.status}
                      disabled={savingStatuses.has(rule.id)}
                      aria-label={t([`Status for ${rule.code}: ${t(status.label)}`, `${rule.code} 的状态：${t(status.label)}`])}>
                      {t(status.label)}<ChevronDown size={13} aria-hidden="true" />
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content className={styles.statusMenu} align="end" sideOffset={5} collisionPadding={8}>
                        <DropdownMenu.RadioGroup value={rule.status} onValueChange={value => {
                          const next = ruleStatuses.find(item => item.id === value);
                          if (next) void changeStatus(rule, next.id);
                        }}>
                          {ruleStatuses.map(option => (
                            <DropdownMenu.RadioItem className={styles.statusOption} key={option.id} value={option.id}>
                              <span className={styles.statusLabel} data-status={option.id}>{t(option.label)}</span>
                              <DropdownMenu.ItemIndicator><Check size={15} aria-hidden="true" /></DropdownMenu.ItemIndicator>
                            </DropdownMenu.RadioItem>
                          ))}
                        </DropdownMenu.RadioGroup>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                  <button type="button" className={`${rulesStyles.secondary} ${styles.editVariable}`}
                    disabled={savingStatuses.has(rule.id)}
                    aria-label={t([`Edit variable ${rule.code}`, `编辑变量 ${rule.code}`])}
                    onClick={() => openEditor({ input: rule, id: rule.id, revision: rule.revision })}>
                    <Pencil size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>;
            })}
          </div>
        </fieldset>
      ))}
      <button type="button" className={rulesStyles.secondary} disabled={!canEdit} onClick={() => openEditor(newVariable(dimension))}>
        <Plus size={15} aria-hidden="true" />{t(["Add variable", "新增变量"])}
      </button>
      {statusError && <p role="alert" className={rulesStyles.error}>{statusError}</p>}
      <p className="sr-only" role="status">{notice}</p>
    </Card>
    <aside className={styles.previewAside} data-connection="preview">
      <Card className={styles.panel}>
        <h2>{previewTitle}</h2>
        {preview}
      </Card>
    </aside>
    <Dialog.Root>
      <div className={styles.drawerBar}>
        <Dialog.Trigger asChild>
          <button type="button">
            <span aria-live="polite">{countLabel}</span>
            <span className={styles.choiceDetail}>{t(["Details", "详情"])}<ChevronUp size={17} aria-hidden="true" /></span>
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className={rulesStyles.overlay} />
        <Dialog.Content className={styles.drawer} aria-describedby={undefined}>
          <div className={styles.drawerHeader}>
            <Dialog.Title>{previewTitle}</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label={t(["Close preview", "关闭组合预览"])}><X size={20} aria-hidden="true" /></button>
            </Dialog.Close>
          </div>
          {preview}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {!canManage && loginPrompt > 0 && <div hidden>
      <CustomerAccount key={loginPrompt} email={null} autoOpen returnTo="/script-lab/generator" />
    </div>}
    {editor === "dimension" && <DimensionEditor endpoint={endpoint} layer={layer} t={t}
      onClose={() => setEditor(null)} onSaved={saved => {
        library.setDimensions(current => [...current, saved]);
        setDimension(saved.code);
        setSearch("");
        setMobileStep("variables");
        setNotice(t(["Dimension saved.", "维度已保存。"]));
        setEditor(null);
      }} />}
    {editor && editor !== "dimension" && <RuleEditor initialEditor={editor} endpoint={endpoint}
      dimensions={library.dimensions} t={t} variableLabels onClose={() => setEditor(null)}
      onSaved={(result, method) => {
        if (result.rule) applySavedVariable(result.rule, method === "POST");
        if (method === "DELETE" && result.id) {
          library.applyRuleChange(result);
          setSelected(current => new Set([...current].filter(id => id !== result.id)));
        }
        setSearch("");
        setNotice(method === "DELETE" ? t(["Variable deleted.", "变量已删除。"]) : t(["Variable saved.", "变量已保存。"]));
        setEditor(null);
      }} />}
    </div>
  </>;
}
