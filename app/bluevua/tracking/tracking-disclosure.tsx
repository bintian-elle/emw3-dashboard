'use client';
import { useId, useState, type ReactNode } from 'react';
import { RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function TrackingDisclosure({id,title,description,preview,children,detailLabel='details'}:{id?:string;title:string;description?:string;preview?:ReactNode;children:ReactNode;detailLabel?:string}){
 const [expanded,setExpanded]=useState(false);
 const contentId=useId();
 return <Card id={id} className="scroll-mt-6 rounded-3xl">
  <CardHeader className="flex flex-wrap items-start justify-between gap-4"><div><CardTitle>{title}</CardTitle>{description&&<CardDescription className="mt-2">{description}</CardDescription>}</div><Button variant="secondary" trailingIcon={expanded?RiArrowUpSLine:RiArrowDownSLine} aria-expanded={expanded} aria-controls={contentId} onClick={()=>setExpanded(value=>!value)}>{expanded?'Hide':'Show'} {detailLabel}</Button></CardHeader>
  <CardContent className="pt-5">{preview}<div id={contentId} hidden={!expanded} className={preview?'mt-5':undefined}>{children}</div></CardContent>
 </Card>;
}
