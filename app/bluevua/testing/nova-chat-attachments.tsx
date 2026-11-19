"use client";

import { useRef, useState, type ClipboardEvent, type Ref } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { attachmentPayloadSize, maxAttachmentPayload, prepareAttachment, type QuestionAttachment } from "@/lib/ai-chat-attachments.client";
import { NovaButton } from "./nova-preview-ui";
import styles from "./nova-chat.module.css";

type Translate = (en: string, zh: string) => string;
const imageTypes = "image/png,image/jpeg,image/webp";

export function useNovaChatAttachments(disabled: boolean, t: Translate) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preparing = useRef(false);
  const generation = useRef(0);
  const [attachments, setAttachments] = useState<QuestionAttachment[]>([]);
  const [preparingFiles, setPreparingFiles] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");

  async function addFiles(files: File[]) {
    if (!files.length || disabled || preparing.current) return;
    const version = generation.current;
    preparing.current = true;
    setPreparingFiles(true);
    setAttachmentError("");
    try {
      const prepared = await Promise.all(files.map(prepareAttachment));
      if (version !== generation.current) return;
      let remaining = maxAttachmentPayload - attachments.reduce((sum, item) => sum + attachmentPayloadSize(item), 0);
      const accepted = prepared.filter(item => {
        const size = attachmentPayloadSize(item);
        if (size > remaining) return false;
        remaining -= size;
        return true;
      });
      setAttachments(previous => [...previous, ...accepted]);
      if (accepted.length < prepared.length) setAttachmentError(t("Some attachments exceed the combined 3.5 MB limit.", "部分附件超过了 3.5 MB 的总大小限制。"));
    } catch (error) {
      if (version === generation.current) setAttachmentError(error instanceof Error ? error.message : t("Could not add attachment.", "无法添加附件。"));
    } finally {
      preparing.current = false;
      setPreparingFiles(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onPaste(event: ClipboardEvent) {
    const images = Array.from(event.clipboardData.items)
      .filter(item => item.kind === "file" && item.type.startsWith("image/"))
      .map(item => item.getAsFile()).filter((file): file is File => file !== null);
    if (!images.length) return;
    event.preventDefault();
    void addFiles(images);
  }

  function clear() {
    generation.current++;
    setAttachments([]);
    setAttachmentError("");
  }

  return {
    attachments, setAttachments, preparingFiles, attachmentError, setAttachmentError, clear, inputRef, addFiles, onPaste,
    onAttach: () => inputRef.current?.click(),
    remove: (id: string) => setAttachments(items => items.filter(item => item.id !== id)),
  };
}

export function NovaChatAttachments({ inputRef, attachments, addFiles, remove, disabled, imagesOnly = false, t }: {
  inputRef: Ref<HTMLInputElement>;
  attachments: QuestionAttachment[];
  addFiles: (files: File[]) => Promise<void>;
  remove: (id: string) => void;
  disabled: boolean;
  imagesOnly?: boolean;
  t: Translate;
}) {
  return <>
    <input ref={inputRef} type="file" hidden multiple accept={imagesOnly ? imageTypes : imageTypes + ",.pdf,.txt,.md,.csv,.json"}
      onChange={event => void addFiles(Array.from(event.target.files ?? []))} />
    {!!attachments.length && <div className={styles.attachments}>{attachments.map(attachment =>
      <div key={attachment.id} className={styles.attachment}>
        {attachment.preview && <Image unoptimized width={40} height={40} src={attachment.preview} alt={attachment.name} />}
        <span className={styles.attachmentName}>{attachment.name}</span>
        <NovaButton type="button" size="icon" variant="ghost" aria-label={`${t("Remove", "删除")} ${attachment.name}`}
          disabled={disabled} onClick={() => remove(attachment.id)}><X aria-hidden /></NovaButton>
      </div>)}</div>}
  </>;
}

export function NovaChatAttachmentStatus({ state, t }: { state: ReturnType<typeof useNovaChatAttachments>; t: Translate }) {
  return <>
    {state.preparingFiles && <p role="status" className={styles.fileStatus}>{t("Preparing attachments…", "正在准备附件…")}</p>}
    {state.attachmentError && <p role="alert" className={styles.fileError}>{state.attachmentError}</p>}
  </>;
}
