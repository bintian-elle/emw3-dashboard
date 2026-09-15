import type { ComponentProps } from "react";
import { cx } from "@/utils/cx";
export function Skeleton({className,...props}:ComponentProps<"div">){return <div data-slot="skeleton" className={cx("animate-pulse rounded-md bg-background-secondary-default",className)} {...props}/>}
