'use client';

import {useState,useSyncExternalStore} from 'react';
import Link from 'next/link';
import {useSearchParams} from 'next/navigation';
import {trackingPeriod} from '@/lib/website-tracking';
import {trackingPages,trackingPageScope,trackingPageHref} from '@/lib/website-tracking-pages';
import { RiArrowLeftSLine, RiBarChartGroupedLine, RiBookOpenLine, RiCursorLine, RiDashboardLine, RiShoppingBagLine, RiSideBarLine } from '@remixicon/react';
import { SidebarProjectLink } from '@/components/brand/sidebar-project-link';
import { IconButton } from '@/components/base/buttons/icon-button';
import { cx } from '@/utils/cx';

const navigation = [
 {id:'site-overview',label:'Website totals',icon:RiDashboardLine},
 {id:'checkout-results',label:'Checkout & purchases',icon:RiShoppingBagLine},
 {id:'all-events',label:'All events',icon:RiCursorLine},
 {id:'definitions',label:'Definitions',icon:RiBookOpenLine},
];
const subscribe=(onChange:()=>void)=>{window.addEventListener('hashchange',onChange);return()=>window.removeEventListener('hashchange',onChange);};
const snapshot=()=>window.location.hash.slice(1)||'overview';
const serverSnapshot=()=>'overview';

export function TrackingSidebar(){
 const [collapsed,setCollapsed]=useState(false);
 const query=useSearchParams();
 let period=trackingPeriod({});try{period=trackingPeriod({start:query.get('start')??undefined,end:query.get('end')??undefined});}catch{}
 const page=query.get('page')??'collection',device=query.get('device')??'all';
 const activeId=useSyncExternalStore(subscribe,snapshot,serverSnapshot);
 return <aside className={cx('w-full border-b border-separator-border bg-background-primary-default p-4 lg:sticky lg:top-0 lg:h-[calc(100dvh-4rem)] lg:self-start lg:overflow-y-auto lg:overscroll-y-contain lg:shrink-0 lg:border-b-0 lg:border-r motion-safe:transition-[width] motion-safe:duration-200',collapsed?'lg:w-20 lg:p-3':'lg:w-60')}>
  <div className="flex min-h-full flex-col">
   <div className="relative min-h-9">
    <div className={cx('w-full min-w-0',collapsed&&'lg:hidden')}><SidebarProjectLink reportName="Website Tracking"/></div>
    <IconButton icon={collapsed?RiSideBarLine:RiArrowLeftSLine} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'} aria-expanded={!collapsed} aria-controls="tracking-navigation" title={collapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setCollapsed(value=>!value)} className="absolute right-0 top-0 hidden lg:inline-flex"/>
   </div>
   <nav id="tracking-navigation" aria-label="Tracking sections" className="mt-4 flex gap-1 overflow-x-auto lg:mt-6 lg:flex-col lg:overflow-visible">
    {trackingPages.filter(item=>item.id!=='checkout').map(item=><Link key={item.id} prefetch={false} href={trackingPageHref(period,device,trackingPageScope(item.id))} aria-label={item.label} title={collapsed?item.label:undefined} aria-current={page===item.id?'page':undefined} className={cx('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-body-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',page===item.id?'bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected':'text-text-secondary hover:bg-background-primary-hover hover:text-text-primary')}><RiBarChartGroupedLine className="size-5 shrink-0" aria-hidden/><span className={cx(collapsed&&'lg:sr-only')}>{item.label}</span></Link>)}
    <div className="hidden border-t border-separator-border lg:my-3 lg:block"/>
    {navigation.map(({id,label,icon:Icon})=><a key={id} href={`#${id}`} aria-label={label} title={collapsed?label:undefined} aria-current={activeId===id?'location':undefined} className={cx('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-body-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',activeId===id?'bg-button-ghost-background text-button-ghost-foreground shadow-nav-selected':'text-text-secondary hover:bg-background-primary-hover hover:text-text-primary')}><Icon className="size-5 shrink-0" aria-hidden/><span className={cx(collapsed&&'lg:sr-only')}>{label}</span></a>)}
   </nav>
  </div>
 </aside>;
}
