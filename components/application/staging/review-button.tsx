'use client';
import {usePathname,useSearchParams} from 'next/navigation';
import {useSyncExternalStore} from 'react';
import {ButtonLink} from '@/components/base/buttons/button';
import {stagingReviewHref,productionPageHref} from '@/lib/staging-navigation';
const subscribeOrigin=()=>()=>{};
const browserOrigin=()=>window.location.origin;
const serverOrigin=()=>'';
export function StagingReviewButton({language}:{language:string}){
 const pathname=usePathname(),params=useSearchParams();
 return <ButtonLink href={stagingReviewHref(pathname,params.toString())} variant="secondary" size="small" onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();window.location.assign(stagingReviewHref(window.location.pathname,window.location.search,window.location.hash));}}}>{language==='zh'?'查看测试环境':'Review staging'}</ButtonLink>;
}

export function ProductionReturnButton({language}:{language:string}){
 const pathname=usePathname(),params=useSearchParams();
 const origin=useSyncExternalStore(subscribeOrigin,browserOrigin,serverOrigin);
 return <ButtonLink href={productionPageHref(pathname,params.toString(),'',origin)} variant="secondary" size="small" onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();window.location.assign(productionPageHref(window.location.pathname,window.location.search,window.location.hash,window.location.origin));}}}>{language==='zh'?'返回正式站':'Return to production'}</ButtonLink>;
}
