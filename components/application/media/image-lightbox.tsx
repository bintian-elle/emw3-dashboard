"use client";

import Image from "next/image";
import {Dialog} from "radix-ui";
import {Image as ImageIcon,X} from "lucide-react";
import styles from "./media-preview.module.css";

export function ImageLightbox({src,alt,size="md",unoptimized=false}:{src:string|null;alt:string;size?:"md"|"lg";unoptimized?:boolean}){
 const thumbnail=<span className={`${styles.thumbnail} ${size==="lg"?styles.large:styles.medium}`}>{src?<Image unoptimized={unoptimized} src={src} alt={alt} fill sizes={size==="lg"?"160px":"128px"} className={styles.thumbnailImage}/>:<ImageIcon className={styles.thumbnailIcon} aria-hidden="true"/>}</span>;
 if(!src)return thumbnail;
 return <Dialog.Root><Dialog.Trigger asChild><button type="button" className={`${styles.thumbnail} ${size==="lg"?styles.large:styles.medium}`} aria-label={`Preview image: ${alt}`}><Image unoptimized={unoptimized} src={src} alt="" fill sizes={size==="lg"?"160px":"128px"} className={styles.thumbnailImage}/></button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content className={`${styles.content} ${styles.imageContent}`} aria-describedby={undefined}><Dialog.Title className={styles.srOnly}>{`Image preview: ${alt}`}</Dialog.Title><Image unoptimized={unoptimized} src={src} alt={alt} fill sizes="90vw" className={styles.image}/><Dialog.Close className={styles.close} aria-label="Close image preview"><X aria-hidden="true"/></Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
