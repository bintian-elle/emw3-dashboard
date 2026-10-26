'use client';
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { parseDate } from '@internationalized/date';
import { RiRefreshLine } from '@remixicon/react';
import { DateRangePicker } from '@/components/base/date-picker/date-range-picker';
import { Select, SelectItem } from '@/components/base/select/select';
import { Button } from '@/components/base/buttons/button';
import type { TrackingPeriod } from '@/lib/website-tracking';
export function TrackingFilters({period,device}:{period:TrackingPeriod;device:string}){
 const router=useRouter();const [pending,startTransition]=useTransition();
 function update(next:TrackingPeriod,nextDevice:string){const query=new URLSearchParams({...next,device:nextDevice});startTransition(()=>router.push(`/bluevua/tracking?${query}`));}
 return <div className="flex flex-wrap items-center gap-3" aria-busy={pending}>
  <DateRangePicker aria-label="Reporting date range" value={{start:parseDate(period.start),end:parseDate(period.end)}} isDisabled={pending} onChange={range=>{if(range)update({start:range.start.toString(),end:range.end.toString()},device);}}/>
  <Select aria-label="Device category" selectedKey={device} isDisabled={pending} onSelectionChange={key=>{if(key)update(period,String(key));}}>{[['all','All devices'],['desktop','Desktop'],['mobile','Mobile'],['tablet','Tablet']].map(([id,label])=><SelectItem key={id} id={id}>{label}</SelectItem>)}</Select>
  <Button variant="secondary" leadingIcon={RiRefreshLine} disabled={pending} onClick={()=>startTransition(()=>{if(window.location.search||window.location.hash)router.replace("/bluevua/tracking");else router.refresh();})}>{pending?'Loading…':'Refresh'}</Button>
 </div>;
}
