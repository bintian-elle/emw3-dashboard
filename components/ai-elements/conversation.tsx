"use client";

import { useCallback, type ComponentProps } from "react";
import { RiArrowDownLine } from "@remixicon/react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

export type ConversationProps=ComponentProps<typeof StickToBottom>;
export function Conversation({className,...props}:ConversationProps){return <StickToBottom className={cx("relative flex-1 overflow-y-hidden",className)} initial="smooth" resize="smooth" role="log" {...props}/>}

export type ConversationContentProps=ComponentProps<typeof StickToBottom.Content>;
export function ConversationContent({className,...props}:ConversationContentProps){return <StickToBottom.Content className={cx("flex flex-col gap-6 p-4",className)} {...props}/>}

export type ConversationScrollButtonProps=Omit<ComponentProps<typeof Button>,"leadingIcon"|"iconOnly">;
export function ConversationScrollButton({className,...props}:ConversationScrollButtonProps){const{isAtBottom,scrollToBottom}=useStickToBottomContext();const handleScroll=useCallback(()=>scrollToBottom(),[scrollToBottom]);if(isAtBottom)return null;return <Button iconOnly size="small" variant="secondary" leadingIcon={RiArrowDownLine} className={cx("absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-sm",className)} onClick={handleScroll} type="button" {...props}/>}
