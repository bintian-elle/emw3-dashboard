"use client";

import { memo, type ComponentProps, type HTMLAttributes } from "react";
import type { UIMessage } from "ai";
import { cjk } from "@streamdown/cjk";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { mermaid } from "@streamdown/mermaid";
import { Streamdown } from "streamdown";
import { cx } from "@/utils/cx";

export type MessageProps=HTMLAttributes<HTMLDivElement>&{from:UIMessage["role"]};
export function Message({className,from,...props}:MessageProps){return <div className={cx("group flex w-full flex-col gap-2",from==="user"?"is-user items-end":"is-assistant items-start",className)} {...props}/>}

export type MessageContentProps=HTMLAttributes<HTMLDivElement>;
export function MessageContent({className,...props}:MessageContentProps){return <div className={cx("min-w-0 max-w-full",className)} {...props}/>}

export type MessageResponseProps=ComponentProps<typeof Streamdown>;
const streamdownPlugins={cjk,code,math,mermaid};
export const MessageResponse=memo(({className,...props}:MessageResponseProps)=><Streamdown className={cx("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",className)} plugins={streamdownPlugins} {...props}/>,(previous,next)=>previous.children===next.children&&previous.isAnimating===next.isAnimating);
MessageResponse.displayName="MessageResponse";
