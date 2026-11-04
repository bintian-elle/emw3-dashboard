'use client';
import {usePathname,useSearchParams} from 'next/navigation';
import {ButtonLink} from '@/components/base/buttons/button';
import {stagingReviewHref} from '@/lib/staging-navigation';
export function StagingReviewButton({language}:{language:string}){
 const pathname=usePathname(),params=useSearchParams();
 return <ButtonLink href={stagingReviewHref(pathname,params.toString())} variant="secondary" size="small" onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();window.location.assign(stagingReviewHref(window.location.pathname,window.location.search,window.location.hash));}}}>{language==='zh'?'查看测试环境':'Review staging'}</ButtonLink>;
}
