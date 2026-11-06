'use client';
import {useEffect,useRef,useState} from 'react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {NovaButton} from './nova-preview-ui';
import {useTemporaryReportContext} from './temporary-report-owner';
import {saveTemporaryReport} from './temporary-report-cache';
type Props={scope:string;frequency:string;start:string;end:string;compareStart?:string;compareEnd?:string;purpose?:'history'|'temporary';campaign?:string;onComplete?:()=>void};
export function HistoryGenerateButton({scope,frequency,start,end,compareStart,compareEnd,purpose='history',campaign='',onComplete}:Props){
 const {language}=useSiteLanguage(),zh=language==='zh',{owner,revisions}=useTemporaryReportContext();const [state,setState]=useState<'idle'|'working'|'error'>('idle'),[error,setError]=useState('');const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 async function generate(){setState('working');setError('');try{
  const response=await fetch('/api/testing/history/generate',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scope,frequency,start,end,purpose,campaign,language,...(compareStart&&compareEnd?{compareStart,compareEnd}:{})})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Report could not be prepared');let job=data.job;
  while(job.status==='queued'||job.status==='running'){
   await new Promise(resolve=>setTimeout(resolve,3000));if(!mounted.current)return;
   const query=new URLSearchParams({id:job.id,purpose});const result=await fetch(`/api/testing/history/generate?${query}`,{cache:'no-store'});const body=await result.json();if(!result.ok)throw Error(body.error||'Report status unavailable');job=body.job;
  }
  if(job.status!=='completed')throw Error(job.error||'Report generation failed');
  if(purpose==='temporary'&&job.result)saveTemporaryReport({owner,revision:revisions[scope]??'',scope,campaign,start,end,compareStart,compareEnd,language},job.result,job.createdAt);
  if(purpose==='history')window.dispatchEvent(new CustomEvent('testing-history-generated'));onComplete?.();if(mounted.current)setState('idle');
 }catch(reason){if(mounted.current){setError(reason instanceof Error?reason.message:'Report generation failed');setState('error');}}}
 return <span><NovaButton type="button" variant="outline" size="sm" disabled={state==='working'} onClick={()=>void generate()}>{state==='working'?(zh?'正在生成…':'Generating…'):(zh?'生成报告':'Generate report')}</NovaButton>{state==='error'&&<small role="alert" style={{display:'block',marginTop:4}}>{zh?'生成失败：':'Generation failed: '}{error}</small>}</span>;
}
