'use client';

import {RiArrowRightLine} from '@remixicon/react';
import {ButtonLink} from '@/components/base/buttons/button';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import type {EdmSpecialMetrics,SocialSpecialMetrics} from '@/lib/channel-special-performance-data';

const count=new Intl.NumberFormat('en-US',{maximumFractionDigits:2});
const currency=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const percent=new Intl.NumberFormat('en-US',{style:'percent',minimumFractionDigits:2,maximumFractionDigits:2});
const show=(value:number|null,formatter:Intl.NumberFormat)=>value==null||!Number.isFinite(value)?'—':formatter.format(value);

type Item={label:string;value:string};
function Metrics({items}:{items:Item[]}){
 return <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">{items.map(item=><div key={item.label} className="min-w-0"><dt className="text-caption-1-regular text-text-tertiary">{item.label}</dt><dd className="mt-1 text-headline-medium tabular-nums text-text-primary">{item.value}</dd></div>)}</dl>;
}
export function EdmChannelPerformance({metrics,href,anchors}:{metrics:EdmSpecialMetrics;href:string;anchors:string[]}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const items=[{label:zh?'送达':'Delivered',value:show(metrics.delivered,count)},{label:zh?'打开率':'Open rate',value:show(metrics.openRate,percent)},{label:zh?'邮件点击率':'Email click rate',value:show(metrics.clickRate,percent)},{label:zh?'订单':'Orders',value:show(metrics.orders,count)},{label:zh?'收入':'Revenue',value:show(metrics.revenue,currency)}];
 return <article className="relative min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6">
  {anchors.map(anchor=><span key={anchor} id={anchor} className="absolute top-0 scroll-mt-40" aria-hidden/>)}
  <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><ButtonLink href={href} variant="ghost" size="small" trailingIcon={RiArrowRightLine} className="h-auto justify-start px-0 py-1 text-headline-medium text-status-blue-text">EDM</ButtonLink><span className="text-caption-1-regular text-text-tertiary">{zh?'所选日期':'Selected period'}</span></div>
  <Metrics items={items}/>
 </article>;
}
export function SocialChannelPerformance({metrics,stale=false}:{metrics:SocialSpecialMetrics;stale?:boolean}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const items=[{label:zh?'观看次数':'Views',value:show(metrics.views,count)},{label:zh?'点赞':'Likes',value:show(metrics.likes,count)},{label:zh?'评论':'Comments',value:show(metrics.comments,count)},{label:zh?'分享':'Shares',value:show(metrics.shares,count)},{label:zh?'收藏':'Saves',value:show(metrics.saved,count)}];
 return <article className="min-w-0 rounded-3xl border border-border-button-default bg-background-primary-default p-5 sm:p-6">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-2"><ButtonLink href="/bluevua/testing/social" variant="ghost" size="small" trailingIcon={RiArrowRightLine} className="h-auto justify-start px-0 py-1 text-headline-medium text-status-blue-text">Social Media</ButtonLink><span className="text-caption-1-regular text-text-tertiary">{zh?'全周期 · 各帖自然表现之和':'Lifetime · Sum of organic post metrics'}{stale?(zh?' · 缓存数据':' · Cached'):''}</span></div>
  <Metrics items={items}/>
 </article>;
}
