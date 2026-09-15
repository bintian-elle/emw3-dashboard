import type { ComponentProps } from "react";
import { cx } from "@/utils/cx";
export function Separator({className,...props}:ComponentProps<"div">){return <div role="separator" data-slot="separator" className={cx("h-px w-full bg-separator-border",className)} {...props}/>}
