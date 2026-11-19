"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PanelRightClose, Sparkles } from "lucide-react";
import { Dialog } from "radix-ui";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { NovaAiComposer } from "@/app/bluevua/testing/nova-ai-composer";
import { NovaAskAiButton } from "@/app/bluevua/testing/nova-ask-ai-button";
import { NovaButton } from "@/app/bluevua/testing/nova-preview-ui";
import chat from "@/app/bluevua/testing/nova-chat.module.css";
import styles from "./market-overview.module.css";

type Turn = { role: "user" | "assistant"; text: string };
type Props = { start: string; end: string; disabled: boolean; market?: "GB" };

export function MarketAskAi(props: Props) {
  return <MarketConversation {...props} key={`${props.start}:${props.end}`} />;
}

function MarketConversation({ start, end, disabled, market }: Props) {
  const [open, setOpen] = useState(false);
  const { language } = useSiteLanguage();
  const t = (en: string, zh: string) => language === "zh" ? zh : en;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const messages = useRef<HTMLDivElement>(null);
  const follow = useRef(true);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (follow.current) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy, open]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (request.current || !question) return;
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
        body: JSON.stringify({ start, end, question, language, market, history: turns.slice(-6) }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || typeof result.answer !== "string") throw new Error("Biceek answer unavailable");
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
  return <Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger asChild><NovaAskAiButton disabled={disabled}>{t("Ask AI Biceek", "询问 AI Biceek")}</NovaAskAiButton></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className={chat.backdrop} />
      <Dialog.Content className={`${chat.panel} ${styles.aiPanel}`}>
        <header className={chat.header}>
          <div className={chat.headerGroup}>
            <Dialog.Close asChild><NovaButton variant="ghost" size="icon" aria-label={t("Close Ask AI Biceek", "收起询问 AI Biceek")}><PanelRightClose /></NovaButton></Dialog.Close>
            <Dialog.Title className={chat.title}>{t("Ask AI Biceek", "询问 AI Biceek")}</Dialog.Title>
          </div>
          {turns.length > 0 && <NovaButton variant="ghost" disabled={busy} onClick={() => { setTurns([]); setDraft(""); setError(""); }}>{t("New conversation", "新对话")}</NovaButton>}
        </header>
        <div className={chat.context}>
          <Dialog.Description className={chat.labelRow}>{t("Discussion scope", "讨论范围")}</Dialog.Description>
          <p className={chat.contextTitle}>{market ? t("Biceek · United Kingdom", "Biceek · 英国") : t("Biceek · All 7 markets", "Biceek · 全部七国市场")}</p>
          <p className={chat.date}>{start} – {end}</p>
        </div>
        <div ref={messages} className={chat.messages} aria-live="polite" onScroll={() => {
          const node = messages.current;
          if (node) follow.current = node.scrollHeight - node.scrollTop - node.clientHeight < 40;
        }}>
          {turns.length ? turns.map((turn, index) => <div key={index} className={styles.aiTurn} data-role={turn.role}>
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
          {!turns.length && <div className={chat.suggestions}>
            <p>{t("Suggested questions", "建议问题")}</p>
            <div className={chat.suggestionList}>{(market ? [suggestions[0], suggestions[2]] : suggestions).map((question) =>
              <NovaButton key={question} variant="outline" className={chat.suggestion} onClick={() => setDraft(question)}>{question}</NovaButton>)}</div>
          </div>}
          {error && <p role="alert" className={styles.aiError}>{error}</p>}
          <NovaAiComposer value={draft} onChange={setDraft} onSubmit={send} disabled={busy} sendDisabled={busy || !draft.trim()}
            inputLabel={t("Type a message", "输入消息")} placeholder={t("Ask about this period…", "询问这个周期…")} sendLabel={t("Send message", "发送消息")} />
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
