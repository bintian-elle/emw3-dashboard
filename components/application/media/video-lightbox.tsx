"use client";

import Image from "next/image";
import {useState} from "react";
import {Dialog} from "radix-ui";
import {Play,X} from "lucide-react";
import styles from "./media-preview.module.css";
import {localTestingThumbnail} from "@/lib/testing-thumbnail";

export function VideoLightbox({src,thumbnailUrl,title,size="lg"}:{src:string;thumbnailUrl:string|null;title:string;size?:"md"|"lg"}){
 const [failedThumbnail,setFailedThumbnail]=useState<string|null>(null);
 const cachedThumbnail=localTestingThumbnail(thumbnailUrl);
 const youtube=/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\//i.test(src);
 return <Dialog.Root><Dialog.Trigger asChild><button type="button" className={`${styles.thumbnail} ${size==="lg"?styles.large:styles.medium}`} aria-label={`Play video: ${title}`}>{thumbnailUrl&&failedThumbnail!==thumbnailUrl&&<Image unoptimized onError={()=>setFailedThumbnail(thumbnailUrl)} src={cachedThumbnail!} alt="" fill sizes={size==="lg"?"160px":"128px"} className={styles.thumbnailImage}/>}<span className={styles.play}><Play aria-hidden="true"/></span></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={`${styles.content} ${styles.videoContent}`} aria-describedby={undefined}><Dialog.Title className={styles.srOnly}>{`Video preview: ${title}`}</Dialog.Title><iframe src={src} referrerPolicy={youtube?"strict-origin-when-cross-origin":undefined} title={title} className={styles.frame} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/><Dialog.Close className={styles.close} aria-label="Close video preview"><X aria-hidden="true"/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
