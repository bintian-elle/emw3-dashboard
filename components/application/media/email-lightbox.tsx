"use client";

import {Dialog} from "radix-ui";
import {MailOpen,X} from "lucide-react";
import styles from "./media-preview.module.css";
import {localizeTestingEmailImages} from "@/lib/testing-thumbnail";

export function EmailLightbox({html,title}:{html:string;title:string}){
 const localHtml=localizeTestingEmailImages(html);
 return <Dialog.Root><Dialog.Trigger asChild><button type="button" disabled={!html} className={`${styles.thumbnail} ${styles.emailThumbnail}`} aria-label={`Preview email: ${title}`}>{html?<iframe srcDoc={localHtml} title={`${title} thumbnail`} tabIndex={-1} className={styles.thumbnailFrame} sandbox=""/>:<MailOpen className={styles.thumbnailIcon} aria-hidden="true"/>}</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={`${styles.content} ${styles.emailContent}`} aria-describedby={undefined}><header className={styles.heading}><Dialog.Title className={styles.headingTitle}><span className={styles.headingLabel}>EMAIL PREVIEW</span>{title}</Dialog.Title><Dialog.Close className={styles.close} aria-label="Close email preview"><X aria-hidden="true"/></Dialog.Close></header><div className={styles.emailBody}><iframe srcDoc={localHtml} title={title} className={styles.emailFrame} sandbox="allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"/></div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
