"use client";
import { AlertCircle } from 'lucide-react';
import { Button, ButtonLink } from '@/components/base/buttons/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useSiteLanguage } from '@/components/application/dashboard/site-language-provider';
export default function TestingReportError({retry}:{error:Error & {digest?:string};retry:()=>void}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 return <div className="p-6" role="alert"><Card><CardHeader><AlertCircle className="size-5 text-text-secondary" aria-hidden/><h1 className="text-title-3-semibold text-text-primary">{zh?'报表暂不可用':'Report unavailable'}</h1></CardHeader><CardContent><p className="my-4 text-body-2-regular text-text-secondary">{zh?'当前报表数据无法加载。可重试，或返回总览查看其他已发布的周期。':'This report could not be loaded. Try again, or return to the overview to view another published period.'}</p><div className="flex flex-wrap gap-3"><Button onClick={retry}>{zh?'重试':'Try again'}</Button><ButtonLink href="/bluevua/testing" variant="secondary">{zh?'返回总览':'Back to overview'}</ButtonLink></div></CardContent></Card></div>;
}
