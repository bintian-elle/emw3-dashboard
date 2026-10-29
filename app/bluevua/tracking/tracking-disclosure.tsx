'use client';
import { useId, useState, type ReactNode } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';

export function TrackingDisclosure({id,title,description,preview,children,detailLabel='details'}:{id?:string;title:string;description?:string;preview?:ReactNode;children:ReactNode;detailLabel?:string}){
 const [expanded,setExpanded]=useState(false);
 const {language}=useSiteLanguage(),zh=language==='zh';
 const titles:Record<string,string>={'Metric definitions & statistical rules':'指标定义与统计规则'};
 const details:Record<string,string>={details:'详情',definitions:'定义说明'};
 const contentId=useId();
 return <Card id={id} className="scroll-mt-6 rounded-[10px]">
  <CardHeader className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>{zh?(titles[title]??title):title}</CardTitle>{description&&<CardDescription className="mt-2">{description}</CardDescription>}</div><Button variant="secondary" trailingIcon={expanded?RiArrowUpSLine:RiArrowDownSLine} aria-expanded={expanded} aria-controls={contentId} onClick={()=>setExpanded(value=>!value)}>{zh?`${expanded?'收起':'显示'}${details[detailLabel]??'详情'}`:`${expanded?'Hide':'Show'} ${detailLabel}`}</Button></CardHeader>
  <CardContent className="pt-5">{preview}<div id={contentId} hidden={!expanded} className={preview?'mt-5':undefined}>{children}</div></CardContent>
 </Card>;
}
