"use client";

import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { PanelRightClose, Sparkles } from "lucide-react";
import { Dialog } from "radix-ui";
import { createPortal } from "react-dom";
import { AskDockContext } from "./ask-dock";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { NovaAiComposer } from "@/app/bluevua/testing/nova-ai-composer";
import { NovaAskAiButton } from "@/app/bluevua/testing/nova-ask-ai-button";
import { NovaButton } from "@/app/bluevua/testing/nova-preview-ui";
import chat from "@/app/bluevua/testing/nova-chat.module.css";
import styles from "./market-overview.module.css";
import type { BiceekChatScope, BiceekChatTurn } from "@/lib/biceek-chat-history";

type Turn = { role: "user" | "assistant"; text: string };
type Props = { comparison: { start: string; end: string }; start: string; end: string; disabled: boolean; market?: "GB" };

function chatMessages(entries: BiceekChatTurn[], id: string): Turn[] {
  return entries.filter(item => item.conversation === id).flatMap(item => [
    { role: "user", text: item.question },
    ...(item.answer ? [{ role: "assistant" as const, text: item.answer }] : []),
  ]);
}

export function MarketAskAi(props: Props) {
  return <MarketConversation {...props} key={`${props.start}:${props.end}:${props.comparison.start}:${props.comparison.end}:${props.market ?? "all"}`} />;
}

function MarketConversation({ start, end, disabled, market, comparison }: Props) {
  const dock = useContext(AskDockContext);
  const open = dock?.open ?? false;
  const desktopDocked = Boolean(dock?.docked);
  const setOpen = dock?.setOpen;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelClose = useRef<HTMLButtonElement>(null);
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
  const [showHistory, setShowHistory] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
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
    const question = draft.trim();
    if (request.current || !question || !historyReady) return;
    const thread = conversation ?? crypto.randomUUID();
    setConversation(thread);
    const controller = new AbortController();
    request.current = controller;
    follow.current = true;
    setTurns([...turns, { role: "user", text: question }]);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/biceek/ask", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...viewScope, question, language, id: crypto.randomUUID(), conversation: thread }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || typeof result.answer !== "string") throw new Error("Biceek answer unavailable");
      if (result.turn) setSaved(previous => [...previous.filter(turn => turn.id !== result.turn.id), result.turn]);
      setTurns((previous) => [...previous, { role: "assistant", text: result.answer }]);
    } catch {
      if (!controller.signal.aborted) {
        setError(t("AI Biceek couldn’t respond. Try sending your question again.", "AI Biceek 暂未回答，请重试。"));
        setDraft(question);
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
  const conversations = Array.from(new Map(saved.toReversed().map(turn => [turn.conversation, turn])).values());
  const panel = <>
        <header className={chat.header}>
          <div className={chat.headerGroup}>
            {desktopDocked
              ? <NovaButton ref={panelClose} variant="ghost" size="icon" aria-label={t("Close Ask AI Biceek", "收起询问 AI Biceek")} onClick={closeDock}><PanelRightClose /></NovaButton>
              : <Dialog.Close asChild><NovaButton variant="ghost" size="icon" aria-label={t("Close Ask AI Biceek", "收起询问 AI Biceek")}><PanelRightClose /></NovaButton></Dialog.Close>}
            {desktopDocked ? <h2 className={chat.title}>{t("Ask AI Biceek", "询问 AI Biceek")}</h2>
              : <Dialog.Title className={chat.title}>{t("Ask AI Biceek", "询问 AI Biceek")}</Dialog.Title>}
          </div>
          <div className={chat.headerActions}>
            <NovaButton variant="ghost" disabled={busy || !historyReady} aria-expanded={showHistory}
              onClick={() => setShowHistory(!showHistory)}>{t("History", "历史")}</NovaButton>
            <NovaButton variant="ghost" disabled={busy || !historyReady} onClick={() => {
              setConversation(null); setViewScope({ start, end, market, comparison });
              setTurns([]); setDraft(""); setError(""); setShowHistory(false);
            }}>{t("New conversation", "新对话")}</NovaButton>
          </div>
        </header>
        <div className={chat.context}>
          {desktopDocked ? <p className={chat.labelRow}>{t("Discussion scope", "讨论范围")}</p>
            : <Dialog.Description className={chat.labelRow}>{t("Discussion scope", "讨论范围")}</Dialog.Description>}
          <p className={chat.contextTitle}>{viewScope.market ? t("Biceek · United Kingdom", "Biceek · 英国") : t("Biceek · All 7 markets", "Biceek · 全部七国市场")}</p>
          <p className={chat.date}>{viewScope.start} – {viewScope.end}</p>
          {viewScope.comparison && <p className={chat.date}>{t("Compare with", "对比周期")} {viewScope.comparison.start} – {viewScope.comparison.end}</p>}
        </div>
        <div ref={messages} className={chat.messages} aria-live="polite" onScroll={() => {
          const node = messages.current;
          if (node) follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
        }}>
          {showHistory ? <div className={chat.suggestionList}>
            {conversations.length ? conversations.map(item => <NovaButton key={item.conversation} variant="outline" className={chat.suggestion}
              onClick={() => {
                setConversation(item.conversation); setViewScope(item.scope); setTurns(chatMessages(saved, item.conversation));
                setDraft(""); setError(""); setShowHistory(false); follow.current = true;
              }}>
              <span>{item.question.slice(0, 96)}</span>
              <span className={chat.date}>{item.scope.start} – {item.scope.end}</span>
            </NovaButton>) : <p className={chat.muted}>{t("No saved conversations yet.", "暂无问答历史。")}</p>}
          </div> : turns.length ? turns.map((turn, index) => <div key={index} className={styles.aiTurn} data-role={turn.role}>
            <strong>{turn.role === "assistant" ? "AI Biceek" : t("You", "你")}</strong>
            <p>{turn.text}</p>
          </div>) : <div className={chat.welcome}>
            <span className={chat.welcomeMark}><Sparkles aria-hidden="true" /></span>
            <h2>{t("What would you like to know about this period?", "你想了解这个周期的什么？")}</h2>
            <p>{t("Ask about UK performance, market differences or daily ROAS.", "可以询问英国表现、市场差异或每日 ROAS。")}</p>
          </div>}
          {busy && <p role="status" className={chat.muted}>{t("Analyzing market performance…", "正在分析市场表现…")}</p>}
          <div ref={bottom} />
        </div>
        <footer className={chat.footer}>
          {historyReady && !showHistory && !turns.length && <div className={chat.suggestions}>
            <p>{t("Suggested questions", "建议问题")}</p>
            <div className={chat.suggestionList}>{(market ? [suggestions[0], suggestions[2]] : suggestions).map((question) =>
              <NovaButton key={question} variant="outline" className={chat.suggestion} onClick={() => setDraft(question)}>{question}</NovaButton>)}</div>
          </div>}
          {error && <p role="alert" className={styles.aiError}>{error === "history_unavailable"
            ? t("Conversation history is unavailable. Reopen the panel to retry.", "暂时无法读取问答历史，请重新打开面板。") : error}</p>}
          <NovaAiComposer value={draft} onChange={setDraft} onSubmit={send} disabled={busy || !historyReady || showHistory} sendDisabled={busy || !historyReady || showHistory || !draft.trim()}
            inputLabel={t("Type a message", "输入消息")} placeholder={t("Ask about this period…", "询问这个周期…")} sendLabel={t("Send message", "发送消息")} />
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
