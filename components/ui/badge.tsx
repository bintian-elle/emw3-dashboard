import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cx } from "@/utils/cx";

const badgeVariants=cva("inline-flex w-fit items-center rounded-md px-2 py-1 text-caption-1-semibold",{variants:{variant:{default:"bg-accent-50 text-accent-700",success:"bg-status-lime-background text-status-lime-text",warning:"bg-status-yellow-background text-status-yellow-text",danger:"bg-status-rose-background text-status-rose-text",secondary:"bg-background-secondary-default text-text-secondary"}},defaultVariants:{variant:"default"}});
export function Badge({className,variant,...props}:ComponentProps<"span">&VariantProps<typeof badgeVariants>){return <span data-slot="badge" className={cx(badgeVariants({variant}),className)} {...props}/>}
