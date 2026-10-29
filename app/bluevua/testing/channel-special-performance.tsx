'use client';

import {RiArrowRightLine} from '@remixicon/react';
import {ButtonLink} from '@/components/base/buttons/button';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {usePathname,useSearchParams} from 'next/navigation';
import {TestingChannelBrand} from './testing-channel-brand';
import type {EdmSpecialMetrics,SocialSpecialMetrics} from '@/lib/channel-special-performance-data';

const count=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const percent=new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2});
const show=(value:number|null,formatter:Intl.NumberFormat)=>value==null||!Number.isFinite(value)?'—':formatter.format(value);

type Item={label:string;value:string};
function usePreviewChannelMarks(){
 const pathname=usePathname(),params=useSearchParams();
 return (pathname==='/bluevua/testing'||pathname==='/bluevua/testing/')&&params.get('designPreview')==='nova';
}
function Metrics({items}:{items:Item[]}){
 return <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">{items.map(item=><div key={item.label} className="min-w-0"><dt className="text-caption-1-regular text-text-tertiary">{item.label}</dt><dd className="mt-1 text-headline-medium tabular-nums text-text-primary">{item.value}</dd></div>)}</dl>;
}
export function EdmChannelPerformance({metrics,href,anchors}:{metrics:EdmSpecialMetrics;href:string;anchors:string[]}){
 const preview=usePreviewChannelMarks();
 const items=[{label:'Delivered',value:show(metrics.delivered,count)},{label:'Open rate',value:show(metrics.openRate,percent)},{label:'Email click rate',value:show(metrics.clickRate,percent)},{label:'Orders',value:show(metrics.orders,count)},{label:'Revenue',value:show(metrics.revenue,currency)}];
 return <article className="relative min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6">
  {anchors.map(anchor=><span key={anchor} id={anchor} className="absolute top-0 scroll-mt-40" aria-hidden/>)}
  <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1">{preview&&<TestingChannelBrand name="EDM"/>}<ButtonLink href={href} variant="ghost" size="small" trailingIcon={RiArrowRightLine} className="h-auto justify-start px-0 py-1 text-headline-medium text-status-blue-text">EDM</ButtonLink></span></div>
  <Metrics items={items}/>
 </article>;
}
export function SocialChannelPerformance({metrics,stale=false}:{metrics:SocialSpecialMetrics;stale?:boolean}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const preview=usePreviewChannelMarks();
 const items=[{label:'Views',value:show(metrics.views,count)},{label:'Likes',value:show(metrics.likes,count)},{label:'Comments',value:show(metrics.comments,count)},{label:'Shares',value:show(metrics.shares,count)},{label:'Saves',value:show(metrics.saved,count)}];
 return <article className="min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-1">{preview&&<TestingChannelBrand name="Social Media"/>}<ButtonLink href="/bluevua/testing/social" variant="ghost" size="small" trailingIcon={RiArrowRightLine} className="h-auto justify-start px-0 py-1 text-headline-medium text-status-blue-text">Social Media</ButtonLink></span>{stale&&<span className="text-caption-1-regular text-text-tertiary">{zh?'缓存数据':'Cached'}</span>}</div>
  <Metrics items={items}/>
 </article>;
}
