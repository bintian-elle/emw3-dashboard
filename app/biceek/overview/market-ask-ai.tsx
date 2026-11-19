"use client";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Check, ChevronDown, ChevronsUpDown, FileText, GitCompareArrows, LayoutDashboard, Plus, Sparkles, X } from "lucide-react";
import { Dialog, DropdownMenu, Select } from "radix-ui";
import { createPortal } from "react-dom";
import { AskDockContext } from "./ask-dock";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { NovaChatHeader } from "@/app/bluevua/testing/nova-chat-header";
import { NovaReportingPeriodCustom, NovaReportingPeriodSelect, novaReportingPeriods } from "@/app/bluevua/testing/nova-reporting-period";
import { resolveTestingPeriod } from "@/lib/testing-period";
import { comparisonRange } from "@/lib/testing-comparison";
import { NovaChatAttachments, NovaChatAttachmentStatus, useNovaChatAttachments } from "@/app/bluevua/testing/nova-chat-attachments";
import { NovaAiComposer } from "@/app/bluevua/testing/nova-ai-composer";
import { NovaAskAiButton } from "@/app/bluevua/testing/nova-ask-ai-button";
import { NovaButton } from "@/app/bluevua/testing/nova-preview-ui";
import chat from "@/app/bluevua/testing/nova-chat.module.css";
import styles from "./market-overview.module.css";
import type { BiceekChatScope, BiceekChatTurn } from "@/lib/biceek-chat-history";

type Turn = { role: "user" | "assistant"; text: string; scope?: BiceekChatScope; attachments?: string[] };
type Props = { comparison: { start: string; end: string }; start: string; end: string; disabled: boolean; market?: "GB"; period: string; latest: string };

function chatMessages(entries: BiceekChatTurn[], id: string): Turn[] {
  return entries.filter(item => item.conversation === id).flatMap(item => [
    { role: "user", text: item.question, scope: item.scope, attachments: item.attachments },
    ...(item.answer ? [{ role: "assistant" as const, text: item.answer }] : []),
  ]);
}

export function MarketAskAi(props: Props) {
  return <MarketConversation {...props} key={`${props.start}:${props.end}:${props.comparison.start}:${props.comparison.end}:${props.market ?? "all"}`} />;
}

function MarketConversation({ start, end, disabled, market, comparison, period, latest }: Props) {
  const dock = useContext(AskDockContext);
  const open = dock?.open ?? false;
  const desktopDocked = Boolean(dock?.docked);
  const setOpen = dock?.setOpen;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelClose = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (desktopDocked) panelClose.current?.focus({ preventScroll: true });
  }, [desktopDocked]);
  function closeDock() {
    setOpen?.(false);
    triggerRef.current?.focus({ preventScroll: true });
  }
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const [saved, setSaved] = useState<BiceekChatTurn[]>([]);
  const [conversation, setConversation] = useState<string | null>(null);
  const [viewScope, setViewScope] = useState<BiceekChatScope>({ start, end, market, comparison });
  const [scopePeriod, setScopePeriod] = useState(period);
  const [showHistory, setShowHistory] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const files = useNovaChatAttachments(busy || !historyReady || showHistory, t);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (!open || busy) return;
    const controller = new AbortController();
    fetch("/api/biceek/ask", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error("History unavailable");
      const { turns: entries } = await response.json() as { turns: BiceekChatTurn[] };
      if (controller.signal.aborted) return;
      setSaved(entries);
      if (!initialized.current) {
        initialized.current = true;
        const latest = entries.findLast(entry => entry.scope.start === start && entry.scope.end === end && entry.scope.market === market
          && entry.scope.comparison?.start === comparison.start && entry.scope.comparison?.end === comparison.end);
        if (latest) {
          setConversation(latest.conversation);
          setTurns(chatMessages(entries, latest.conversation));
        }
      }
      setHistoryReady(true);
      setError(previous => previous === "history_unavailable" ? "" : previous);
    }).catch(() => { if (!controller.signal.aborted) setError("history_unavailable"); });
    return () => controller.abort();
  }, [open, busy, start, end, market, comparison.start, comparison.end]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (follow.current) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy, open]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const outgoing = files.attachments;
    const question = draft.trim() || (outgoing.length ? t("Analyze these images.", "请分析这些图片。") : "");
    if (request.current || !question || !historyReady || files.preparingFiles || showHistory) return;
    const thread = conversation ?? crypto.randomUUID();
    setConversation(thread);
    const controller = new AbortController();
    request.current = controller;
    follow.current = true;
    setTurns([...turns, { role: "user", text: question, scope: viewScope, attachments: outgoing.map(file => file.name) }]);
    files.clear();
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/biceek/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...viewScope, question, language, id: crypto.randomUUID(), conversation: thread,
          attachments: outgoing.map(({ kind, name, mime_type, data }) => ({ kind, name, mime_type, data })) }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || typeof result.answer !== "string") throw new Error("Biceek answer unavailable");
      if (result.turn) setSaved(previous => [...previous.filter(turn => turn.id !== result.turn.id), result.turn]);
      setTurns((previous) => [...previous, { role: "assistant", text: result.answer }]);
    } catch {
      if (!controller.signal.aborted) {
        setError(t("AI Biceek couldn’t respond. Try sending your question again.", "AI Biceek 暂未回答，请重试。"));
        setDraft(draft);
        files.setAttachments(outgoing);
        setTurns(turns);
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!controller.signal.aborted) setBusy(false);
      }
    }
  }

  const suggestions = [
    t("Summarize the UK’s performance for this period.", "总结这个周期的英国市场表现。"),
    t("Which markets had the strongest Total ROAS and meaningful spend?", "哪些市场的 Total ROAS 较高，同时有一定花费？"),
    t("Compare Google Ads and Meta Ads in the UK.", "比较英国市场的 Google Ads 和 Meta Ads。"),
  ];
  const conversations = Array.from(new Map(saved.map(turn => [turn.conversation, turn])).values()).reverse();
  const scopeName = (scope: BiceekChatScope) => scope.market
    ? t("United Kingdom", "英国") : t("Overview · 7 markets", "总览 · 七国市场");
  const reset = () => {
    files.clear();
    setConversation(null); setViewScope({ start, end, market, comparison }); setScopePeriod(period);
    setTurns([]); setDraft(""); setError(""); setShowHistory(false);
  };
  const restore = (id: string) => {
    const item = conversations.find(turn => turn.conversation === id);
    if (!item) return;
    files.clear();
    setConversation(item.conversation); setViewScope(item.scope); setTurns(chatMessages(saved, item.conversation));
    setScopePeriod("custom"); setDraft(""); setError(""); setShowHistory(false); follow.current = true;
  };
  const panel = <>
        <NovaChatHeader
          title={desktopDocked ? <h2 className={chat.title}>{t("Ask AI Biceek", "询问 AI Biceek")}</h2>
            : <Dialog.Title className={chat.title}>{t("Ask AI Biceek", "询问 AI Biceek")}</Dialog.Title>}
          collapseRef={panelClose} onCollapse={closeDock} onHistory={() => setShowHistory(!showHistory)} onNew={reset}
          historyOpen={showHistory} historyDisabled={busy || !historyReady} newDisabled={busy || !historyReady} />
        {showHistory && <div className={chat.history}>
          {conversations.length ? <Select.Root value={conversation ?? undefined} onValueChange={restore}>
            <Select.Trigger asChild><NovaButton variant="outline" aria-label={t("Restore a conversation", "恢复历史对话")}>
              <Select.Value placeholder={t("Select a conversation", "选择历史对话")} /><Select.Icon><ChevronDown /></Select.Icon>
            </NovaButton></Select.Trigger>
            <Select.Portal><Select.Content className={chat.dropdown} position="popper" sideOffset={4}><Select.Viewport>
              {conversations.map(item => <Select.Item key={item.conversation} value={item.conversation} className={chat.dropdownItem}>
                <Select.ItemText>{item.question.slice(0, 96)}</Select.ItemText><Select.ItemIndicator><Check /></Select.ItemIndicator>
              </Select.Item>)}
            </Select.Viewport></Select.Content></Select.Portal>
          </Select.Root> : <p className={chat.muted}>{t("No saved conversations yet.", "暂无已保存的对话。")}</p>}
        </div>}
        <section className={chat.context} aria-label={t("Discussion context", "讨论上下文")}>
          {!desktopDocked && <Dialog.Description className="sr-only">{t("Discussion context", "讨论上下文")}</Dialog.Description>}
          <div className={chat.contextHeading}>
            <div className={chat.subjectRow} aria-live="polite">
              <span className={chat.subjectIcon}><LayoutDashboard aria-hidden /></span>
              <div><span>{t("Discussion scope", "讨论范围")}</span><strong>{scopeName(viewScope)}</strong>
                <span>{viewScope.start} – {viewScope.end}</span></div>
              <span className={chat.contextCheck}><Check aria-hidden /></span>
            </div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild><NovaButton variant="outline" size="sm" className={chat.changeScope} disabled={busy}>
                <ChevronsUpDown aria-hidden />{t("Change subject", "切换讨论对象")}
              </NovaButton></DropdownMenu.Trigger>
              <DropdownMenu.Portal><DropdownMenu.Content className={chat.dropdown} sideOffset={4}>
                {([undefined, "GB"] as const).map(key => <DropdownMenu.Item key={key ?? "all"} className={chat.dropdownItem}
                  onSelect={() => setViewScope(current => ({ ...current, market: key }))}>
                  {scopeName({ ...viewScope, market: key })}{key === viewScope.market && <Check aria-hidden />}
                </DropdownMenu.Item>)}
              </DropdownMenu.Content></DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          {viewScope.comparison && <div className={chat.selectedComparisons}><div className={chat.comparison}>
            <GitCompareArrows aria-hidden /><span>{t("Compare:", "对比：")} {viewScope.comparison.start} – {viewScope.comparison.end}</span>
            <NovaButton variant="ghost" size="icon" disabled={busy} aria-label={t("Remove comparison", "移除比较")}
              onClick={() => setViewScope(current => ({ ...current, comparison: undefined }))}><X aria-hidden /></NovaButton>
          </div></div>}
          <div className={chat.contextControls}>
            <div className={chat.period}><NovaReportingPeriodSelect value={scopePeriod} ariaLabel={t("AI discussion period", "AI 讨论时间")}
              options={novaReportingPeriods} disabled={busy} onValueChange={value => {
                setScopePeriod(value);
                if (value === "custom") return;
                const preset = novaReportingPeriods.find(([key]) => key === value)?.[0];
                if (preset) setViewScope(current => ({ ...current, ...resolveTestingPeriod(latest, { preset }) }));
              }} /></div>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild><NovaButton variant="outline" size="sm" className={chat.addComparison} disabled={busy}>
                <Plus aria-hidden />{t("Add comparison", "添加对比对象")}
              </NovaButton></DropdownMenu.Trigger>
              <DropdownMenu.Portal><DropdownMenu.Content className={chat.dropdown} sideOffset={4}>
                {([["previousPeriod", t("Previous period", "上一周期")], ["previousYear", t("Previous year", "去年同期")]] as const).map(([kind, label]) =>
                  <DropdownMenu.Item key={kind} className={chat.dropdownItem}
                    onSelect={() => setViewScope(current => ({ ...current, comparison: comparisonRange(current, kind, latest) }))}>{label}</DropdownMenu.Item>)}
              </DropdownMenu.Content></DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
          {scopePeriod === "custom" && <div className={chat.customPeriod}>
            <NovaReportingPeriodCustom start={viewScope.start} end={viewScope.end} zh={language === "zh"} disabled={busy}
              onApply={range => setViewScope(current => ({ ...current, start: range.start.toString(), end: range.end.toString() }))} />
          </div>}
        </section>
        <div ref={messages} className={chat.messages} role="log" aria-label={t("AI conversation", "AI 对话记录")} aria-live="polite" onScroll={() => {
          const node = messages.current;
          if (node) follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
        }}>
          {turns.length ? <div className={chat.turns}>{turns.map((turn, index) => <div key={index} className={chat.message}>
            {turn.role === "user" ? <div className={chat.question}>
              {turn.scope && <p className={chat.messageMeta}>{scopeName(turn.scope)} · {turn.scope.start} – {turn.scope.end}</p>}<p>{turn.text}</p>
              {turn.attachments?.map((name, index) => <span key={index} className={chat.messageFile}><FileText aria-hidden />{name}</span>)}
            </div> : <div className={chat.answer}><span className={chat.answerMark}><Sparkles aria-hidden /></span>
              <div><p className={chat.answerLabel}>AI Biceek</p><p className={styles.aiAnswerText}>{turn.text}</p></div>
            </div>}
          </div>)}</div> : <div className={chat.welcome}>
            <span className={chat.welcomeMark}><Sparkles aria-hidden="true" /></span>
            <h2>{t("What would you like to know about this period?", "你想了解这个周期的什么？")}</h2>
            <p>{t("Ask about UK performance, market differences or daily ROAS.", "可以询问英国表现、市场差异或每日 ROAS。")}</p>
          </div>}
          {busy && <p role="status" className={chat.muted}>{t("Analyzing market performance…", "正在分析市场表现…")}</p>}
          <div ref={bottom} />
        </div>
        <footer className={chat.footer}>
          {historyReady && !showHistory && <div className={chat.suggestions}>
            <p><Sparkles aria-hidden />{turns.length ? t("Keep exploring", "继续探索") : t("Try asking", "你可以这样问")}</p>
            <div className={chat.suggestionList}>{(market ? [suggestions[0], suggestions[2]] : suggestions).map((question, index) =>
              <NovaButton key={question} variant="outline" className={chat.suggestion} disabled={busy} onClick={() => { setDraft(question); inputRef.current?.focus(); }}>
                <span className={chat.suggestionNumber}>{String(index + 1).padStart(2, "0")}</span><span>{question}</span><ArrowUpRight aria-hidden />
              </NovaButton>)}</div>
          </div>}
          {error && <p role="alert" className={styles.aiError}>{error === "history_unavailable"
            ? t("Conversation history is unavailable. Reopen the panel to retry.", "暂时无法读取问答历史，请重新打开面板。") : error}</p>}
          <NovaChatAttachments inputRef={files.inputRef} attachments={files.attachments} addFiles={files.addFiles} remove={files.remove} disabled={busy || files.preparingFiles} imagesOnly t={t} />
          <NovaAiComposer inputRef={inputRef} value={draft} onChange={setDraft} onSubmit={send} disabled={busy || !historyReady || showHistory} sendDisabled={busy || !historyReady || showHistory || files.preparingFiles || (!draft.trim() && !files.attachments.length)}
            onAttach={files.onAttach} onPaste={files.onPaste} attachDisabled={busy || !historyReady || showHistory || files.preparingFiles} attachLabel={t("Add attachments", "添加附件")}
            inputLabel={t("Type a message", "输入消息")} placeholder={t("Type your question…", "输入你的问题…")} sendLabel={t("Send message", "发送消息")} />
          <NovaChatAttachmentStatus state={files} t={t} />
        </footer>
  </>;

  const name = t("Ask AI Biceek", "询问 AI Biceek");
  return <>
    <NovaAskAiButton ref={triggerRef} disabled={disabled} onClick={() => open ? closeDock() : setOpen?.(true)}
      aria-expanded={open} aria-controls={open ? "biceek-ask-panel" : undefined}>{name}</NovaAskAiButton>
    {open && (desktopDocked && dock?.slot
      ? createPortal(<aside id="biceek-ask-panel" aria-label={name} className={`${chat.panel} ${chat.dockedPanel} ${styles.askDockPanel}`}
          onKeyDown={event => { if (event.key === "Escape") closeDock(); }}>
          <div role="separator" tabIndex={0} aria-orientation="vertical" aria-label={t("Resize Ask AI panel", "调整问答面板宽度")}
            aria-valuemin={352} aria-valuemax={840} aria-valuenow={dock.width} className={chat.resize}
            onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
            onPointerMove={event => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) dock.resize(window.innerWidth - event.clientX);
            }}
            onKeyDown={event => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              dock.resize(dock.width + (event.key === "ArrowLeft" ? 20 : -20));
            }} />
          {panel}</aside>, dock.slot)
      : <Dialog.Root open onOpenChange={setOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className={chat.backdrop} style={{ top: dock?.topbarHeight }} />
            <Dialog.Content id="biceek-ask-panel" className={`${chat.panel} ${styles.aiPanel}`}
              style={dock ? { top: dock.topbarHeight, height: `calc(100dvh - ${dock.topbarHeight}px)` } : undefined}
              onCloseAutoFocus={event => { event.preventDefault(); triggerRef.current?.focus({ preventScroll: true }); }}>{panel}</Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>)}
  </>;
}
