'use client';
import {useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {parseDate} from '@internationalized/date';
import {RiRefreshLine} from '@remixicon/react';
import {DateRangePicker} from '@/components/base/date-picker/date-range-picker';
import {Select,SelectItem} from '@/components/base/select/select';
import {Button} from '@/components/base/buttons/button';
import {trackingPages,trackingPageScope,trackingPageHref,type TrackingPageScope} from '@/lib/website-tracking-pages';
import type {TrackingPeriod} from '@/lib/website-tracking';
export function TrackingFilters({period,device,scope,paths=[]}:{period:TrackingPeriod;device:string;scope:TrackingPageScope;paths?:string[]}){
 const router=useRouter(),[pending,startTransition]=useTransition();
 function update(nextPeriod:TrackingPeriod,nextDevice:string,nextScope:TrackingPageScope){startTransition(()=>router.push(trackingPageHref(nextPeriod,nextDevice,nextScope)));}
 const options=Array.from(new Set([...(scope.path?[scope.path]:[]),...paths])).sort();
 return <div className="flex flex-wrap items-center gap-3" aria-busy={pending}>
 <DateRangePicker aria-label="Reporting date range" value={{start:parseDate(period.start),end:parseDate(period.end)}} isDisabled={pending} onChange={range=>{if(range)update({start:range.start.toString(),end:range.end.toString()},device,scope);}}/>
 <Select aria-label="Device category" selectedKey={device} isDisabled={pending} onSelectionChange={key=>{if(key)update(period,String(key),scope);}}>{[['all','All devices'],['desktop','Desktop'],['mobile','Mobile'],['tablet','Tablet']].map(([id,label])=><SelectItem key={id} id={id}>{label}</SelectItem>)}</Select>
 <Select aria-label="Page type" selectedKey={scope.page} isDisabled={pending} onSelectionChange={key=>{if(key)update(period,device,trackingPageScope(String(key)));}}>{trackingPages.map(page=><SelectItem key={page.id} id={page.id}>{page.label}</SelectItem>)}</Select>
 <Select aria-label="Specific page URL" selectedKey={scope.path||'all'} isDisabled={pending||scope.page==='other'||scope.page==='checkout'} triggerClassName="max-w-64" popoverClassName="max-w-full" onSelectionChange={key=>{if(key)update(period,device,trackingPageScope(scope.page,key==='all'?'':String(key)));}}><SelectItem id="all">All pages in this scope</SelectItem>{options.map(path=><SelectItem id={path} key={path}>{path}</SelectItem>)}</Select>
 <Button variant="secondary" leadingIcon={RiRefreshLine} disabled={pending} onClick={()=>startTransition(()=>{if(window.location.search||window.location.hash)router.replace('/bluevua/tracking');else router.refresh();})}>{pending?'Loading…':'Refresh'}</Button>
 </div>;
}
