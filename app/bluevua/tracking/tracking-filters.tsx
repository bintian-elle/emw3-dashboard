'use client';
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {parseDate} from '@internationalized/date';
import {RefreshCw} from 'lucide-react';
import {DateRangePicker} from '@/components/base/date-picker/date-range-picker';
import {Select,SelectItem} from '@/components/base/select/select';
import {Button} from '@/components/base/buttons/button';
import {trackingPages,trackingPageScope,trackingPageHref,type TrackingPageScope} from '@/lib/website-tracking-pages';
import type {TrackingPeriod} from '@/lib/website-tracking';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {pageNamesZh} from './labels';
export function TrackingFilters({period,device,scope,paths=[]}:{period:TrackingPeriod;device:string;scope:TrackingPageScope;paths?:string[]}){
 const router=useRouter(),[pending,startTransition]=useTransition();
 const {language}=useSiteLanguage(),zh=language==='zh';
 function update(nextPeriod:TrackingPeriod,nextDevice:string,nextScope:TrackingPageScope){startTransition(()=>router.push(trackingPageHref(nextPeriod,nextDevice,nextScope)));}
 const options=Array.from(new Set([...(scope.path?[scope.path]:[]),...paths])).sort();
 return <div className="flex flex-wrap items-center gap-3" aria-busy={pending}>
 <DateRangePicker aria-label={zh?'报告日期范围':'Reporting date range'} value={{start:parseDate(period.start),end:parseDate(period.end)}} isDisabled={pending} onChange={range=>{if(range)update({start:range.start.toString(),end:range.end.toString()},device,scope);}}/>
 <Select aria-label={zh?'设备类型':'Device category'} selectedKey={device} isDisabled={pending} onSelectionChange={key=>{if(key)update(period,String(key),scope);}}>{[['all','All devices','全部设备'],['desktop','Desktop','电脑'],['mobile','Mobile','手机'],['tablet','Tablet','平板']].map(([id,label,translated])=><SelectItem key={id} id={id}>{zh?translated:label}</SelectItem>)}</Select>
 <Select aria-label={zh?'页面类型':'Page type'} selectedKey={scope.page} isDisabled={pending} onSelectionChange={key=>{if(key)update(period,device,trackingPageScope(String(key)));}}>{trackingPages.map(page=><SelectItem key={page.id} id={page.id}>{zh?pageNamesZh[page.id]:page.label}</SelectItem>)}</Select>
 <Select aria-label={zh?'指定页面网址':'Specific page URL'} selectedKey={scope.path||'all'} isDisabled={pending||scope.page==='other'||scope.page==='checkout'} triggerClassName="max-w-64" popoverClassName="max-w-full" onSelectionChange={key=>{if(key)update(period,device,trackingPageScope(scope.page,key==='all'?'':String(key)));}}><SelectItem id="all">{zh?'此范围内的全部页面':'All pages in this scope'}</SelectItem>{options.map(path=><SelectItem id={path} key={path}>{path}</SelectItem>)}</Select>
 <Button variant="secondary" leadingIcon={RefreshCw} disabled={pending} onClick={()=>startTransition(()=>{if(window.location.search||window.location.hash)router.replace('/bluevua/tracking');else router.refresh();})}>{pending?(zh?'正在加载…':'Loading…'):(zh?'刷新':'Refresh')}</Button>
 </div>;
}
