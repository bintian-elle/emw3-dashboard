"use client";

import { useState } from "react";
import { RiSparkling2Line } from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { useSiteLanguage } from "@/components/application/dashboard/site-language-provider";
import { cx } from "@/utils/cx";
import { useReadoutQuestionDock } from "./use-readout-question-dock";

export function ReadoutQuestion({onAsk,onOpen,canAsk,overview,expanded,detailsId,bottomId,channelOverview=false}:{onAsk:(question:string)=>Promise<boolean>;onOpen:()=>void;canAsk:boolean;overview:boolean;expanded:boolean;detailsId:string;bottomId:string;channelOverview?:boolean}){
 const [question,setQuestion]=useState('');
 const {dock,anchorRef,formRef}=useReadoutQuestionDock({expanded,detailsId,bottomId});
 const {language}=useSiteLanguage(),zh=language==='zh';

 return <div ref={anchorRef} className="relative min-h-10 min-w-64 flex-1">
  <form ref={formRef} aria-label={channelOverview?(zh?'询问渠道洞察':'Ask about channel insights'):overview?(zh?'询问整体洞察':'Ask about Overview insights'):(zh?'询问 Campaign 洞察':'Ask about campaign insights')} data-docked={dock?'true':'false'} style={dock?{left:dock.left,width:dock.width,top:dock.top}:undefined} className={cx('flex flex-wrap items-center gap-2',dock&&'absolute z-10')} onSubmit={event=>{event.preventDefault();if(question.trim()){const submitted=question;void onAsk(submitted.trim()).then(sent=>{if(sent)setQuestion(current=>current===submitted?'':current);});}else onOpen();}}>
   <Input className="min-w-32 flex-1" aria-label={zh?'输入关于这些洞察的问题':'Enter a question about these insights'} placeholder={overview?(zh?'基于这些洞察提问…':'Ask about these insights…'):(zh?'询问此 Campaign…':'Ask about this campaign…')} value={question} onChange={setQuestion} maxLength={2000}/>
   <Button type="submit" variant="secondary" size="small" className="min-h-10 shrink-0" leadingIcon={RiSparkling2Line} aria-label={channelOverview?(zh?'询问渠道洞察':'Ask about channel insights'):overview?(zh?'询问 Overview':'Ask about Overview'):(zh?'追问此 Campaign':'Ask about this campaign')} disabled={!canAsk}>{zh?'询问 AI':'Ask AI'}</Button>
  </form>
 </div>;
}
