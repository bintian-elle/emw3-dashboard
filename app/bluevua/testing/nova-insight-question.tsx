'use client';

import {useState} from 'react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {NovaAiComposer} from './nova-ai-composer';
import {useReadoutQuestionDock} from './use-readout-question-dock';
import styles from './nova-preview-sections.module.css';

type Props={expanded:boolean;detailsId:string;bottomId:string;canAsk:boolean;ask:(value:string)=>Promise<boolean>;open:()=>void;scope:'overview'|'channel'|'test'};

/** The same question form remains mounted as it moves between the readout actions. */
export function NovaInsightQuestion({expanded,detailsId,bottomId,canAsk,ask,open,scope}:Props){
 const [value,setValue]=useState('');
 const {language}=useSiteLanguage(),zh=language==='zh';
 const {dock,anchorRef,formRef}=useReadoutQuestionDock({expanded,detailsId,bottomId});
 const formLabel=scope==='overview'?(zh?'询问整体洞察':'Ask about Overview insights'):scope==='channel'?(zh?'询问渠道洞察':'Ask about channel insights'):(zh?'询问测试洞察':'Ask about test insights');
 const sendLabel=scope==='overview'?(zh?'询问 Overview':'Ask about Overview'):(zh?'询问 AI':'Ask AI');
 return <div className={styles.questionAnchor} ref={anchorRef}>
  <NovaAiComposer formRef={formRef} style={dock?{position:'absolute',zIndex:10,left:dock.left,width:dock.width,top:dock.top}:undefined} formLabel={formLabel} inputLabel={zh?'输入关于这些洞察的问题':'Enter a question about these insights'} placeholder={zh?'基于这些洞察提问…':'Ask about these insights…'} value={value} onChange={setValue} sendLabel={sendLabel} sendDisabled={!canAsk} onSubmit={event=>{event.preventDefault();if(!value.trim()){open();return;}const submitted=value;void ask(submitted.trim()).then(sent=>{if(sent)setValue(current=>current===submitted?'':current);});}}/>
 </div>;
}
