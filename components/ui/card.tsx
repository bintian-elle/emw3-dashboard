import type { ComponentProps } from "react";
import { cx } from "@/utils/cx";

export function Card({className,...props}:ComponentProps<"div">){return <div data-slot="card" className={cx("min-w-0 rounded-2xl border border-border-button-default bg-background-primary-default text-text-primary shadow-xs",className)} {...props}/>}
export function CardHeader({className,...props}:ComponentProps<"div">){return <div data-slot="card-header" className={cx("grid gap-1.5 px-6 pt-6",className)} {...props}/>}
export function CardTitle({className,...props}:ComponentProps<"h3">){return <h3 data-slot="card-title" className={cx("text-title-3-semibold text-text-primary",className)} {...props}/>}
export function CardDescription({className,...props}:ComponentProps<"p">){return <p data-slot="card-description" className={cx("text-body-2-regular text-text-secondary",className)} {...props}/>}
export function CardContent({className,...props}:ComponentProps<"div">){return <div data-slot="card-content" className={cx("px-6 pb-6",className)} {...props}/>}
export function CardFooter({className,...props}:ComponentProps<"div">){return <div data-slot="card-footer" className={cx("flex items-center border-t border-separator-border px-6 py-4",className)} {...props}/>}
