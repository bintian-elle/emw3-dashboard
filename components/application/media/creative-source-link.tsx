"use client";

import {Tooltip} from "radix-ui";
import {useSiteLanguage} from "@/components/application/dashboard/site-language-provider";
import styles from "./media-preview.module.css";

export function CreativeSourceLink({href,name,kind}:{href:string;name:string;kind:"post"|"preview"}){
 const {language}=useSiteLanguage();
 const label=kind==="post"?(language==="zh"?"查看原帖":"View original post"):(language==="zh"?"查看广告预览":"View ad preview");
 return <Tooltip.Provider><Tooltip.Root><Tooltip.Trigger asChild><a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>{name}</a></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className={styles.tooltip} sideOffset={5}>{label}</Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider>;
}
