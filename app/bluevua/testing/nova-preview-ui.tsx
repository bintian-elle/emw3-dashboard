"use client";

import type { ComponentProps, ReactNode } from "react";
import { Slot } from "radix-ui";
import buttonStyles from "@/components/base/buttons/nova-button.module.css";
import styles from "./nova-preview-ui.module.css";

// Source-owned shadcn Nova primitive structure, adapted from the reference
// project's components/ui to use preview-scoped tokens and styles.
export function NovaButton({variant="default",size="default",asChild=false,className,children,...props}:ComponentProps<"button"> & {variant?:"default"|"outline"|"ghost";size?:"default"|"sm"|"icon";asChild?:boolean}){
 const Comp=asChild?Slot.Root:"button";
 return <Comp data-slot="button" data-variant={variant} data-size={size} className={[buttonStyles.button,className].filter(Boolean).join(" ")} {...props}>{children}</Comp>;
}
export function NovaInput({className,...props}:ComponentProps<"input">){return <input data-slot="input" className={[styles.input,className].filter(Boolean).join(" ")} {...props}/>;}
export function NovaCard({className,...props}:ComponentProps<"div">){return <div data-slot="card" className={[styles.card,className].filter(Boolean).join(" ")} {...props}/>;}
export function NovaTable({children,...props}:ComponentProps<"table">){return <div data-slot="table-container" className={styles.tableContainer}><table data-slot="table" className={styles.table} {...props}>{children}</table></div>;}
export function NovaTableHeader(props:ComponentProps<"thead">){return <thead data-slot="table-header" {...props}/>;}
export function NovaTableBody(props:ComponentProps<"tbody">){return <tbody data-slot="table-body" {...props}/>;}
export function NovaTableRow(props:ComponentProps<"tr">){return <tr data-slot="table-row" {...props}/>;}
export function NovaTableHead(props:ComponentProps<"th">){return <th data-slot="table-head" {...props}/>;}
export function NovaTableCell({children,...props}:ComponentProps<"td"> & {children?:ReactNode}){return <td data-slot="table-cell" {...props}>{children}</td>;}
