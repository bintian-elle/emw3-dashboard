'use client';
import type {ReactNode} from 'react';
import {DropdownMenu} from 'radix-ui';
import {ChevronsUpDown} from 'lucide-react';
import {NovaButton} from './nova-preview-ui';
import styles from './nova-chat.module.css';
/** Shared Campaign menu surface for Ask AI and prompt trials. */
export function CampaignScopeMenu({label,children,disabled=false,trigger}:{label:string;children:ReactNode;disabled?:boolean;trigger?:ReactNode}){
 return <DropdownMenu.Root><DropdownMenu.Trigger asChild>{trigger??<NovaButton variant="outline" disabled={disabled} aria-label={label}><ChevronsUpDown aria-hidden/>{label}</NovaButton>}</DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className={styles.dropdown} sideOffset={4} align="end">{children}</DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}
export function CampaignScopeItem({label,selected,onSelect}:{label:string;selected:boolean;onSelect:()=>void}){return <DropdownMenu.Item className={styles.dropdownItem} role="menuitemradio" aria-checked={selected} onSelect={onSelect}>{label}</DropdownMenu.Item>;}
