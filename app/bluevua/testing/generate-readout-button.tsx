'use client';
import {useEffect,useRef,useState} from 'react';
import {LoaderCircle} from 'lucide-react';
import styles from './generate-readout-button.module.css';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {testingReadoutKey,type ReadoutPeriod} from '@/lib/testing-readout-contract';
import {manualTestingScope} from '@/lib/testing-manual-scope';
import {NovaButton} from './nova-preview-ui';
import {invalidateMissingTestingReadouts} from '@/lib/testing-readout-fetch';

export function GenerateReadoutButton({period,scope}:{period?:ReadoutPeriod|null;scope:string}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const [state,setState]=useState<'idle'|'loading'|'error'>('idle');
 const [stage,setStage]=useState<'preparing'|'queued'|'running'>('preparing');
 const [elapsed,setElapsed]=useState(0);
 const startedAt=useRef(0);
 const alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(state!=='loading')return;const timer=setInterval(()=>setElapsed(Math.floor((Date.now()-startedAt.current)/1000)),1000);return()=>clearInterval(timer);},[state]);
 if(!period||period.concludedTestId||!period.start||!period.end||period.label==='Lifetime snapshot'||period.label.startsWith('Lifetime ('))return null;
 const generate=async()=>{
  startedAt.current=Date.now();setElapsed(0);setStage('preparing');setState('loading');
  try{
   for(let attempt=0;attempt<120;attempt++){
    const response=await fetch('/api/testing/readouts/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...period,scope,retry:attempt===0}),signal:AbortSignal.timeout(120000)});
    if(!response.ok)throw Error('Generation failed');
    const result=await response.json() as {pending?:boolean;status?:string};
    if(alive.current&&result.pending&&['preparing','queued','running'].includes(result.status??''))setStage(result.status as 'preparing'|'queued'|'running');
    if(!result.pending){if(alive.current){invalidateMissingTestingReadouts(testingReadoutKey({...period,manualScope:manualTestingScope(scope)??undefined})??undefined);window.dispatchEvent(new CustomEvent('testing-readout-generated'));setState('idle');}return;}
    await new Promise(resolve=>setTimeout(resolve,5000));
    if(!alive.current)return;
   }
   throw Error('Generation timed out');
  }catch{if(alive.current)setState('error');}
 };
 const stageLabel=stage==='preparing'?(zh?'正在准备数据':'Preparing data'):stage==='queued'?(zh?'等待 AI 任务':'Waiting for AI'): (zh?'AI 处理中':'AI processing');
 const time=`${Math.floor(elapsed/60)}:${String(elapsed%60).padStart(2,'0')}`;
 return <span className={styles.container}><NovaButton type="button" variant="outline" size="sm" disabled={state==='loading'} onClick={()=>void generate()}>{state==='loading'?<><LoaderCircle className={styles.spinner} aria-hidden="true"/><span role="status">{stageLabel}</span><span className={styles.time} aria-label={zh?`已用时 ${time}`:`Elapsed ${time}`} aria-live="off">{time}</span></>:(zh?'生成分析':'Generate analysis')}</NovaButton>{state==='error'&&<span role="alert">{zh?'生成失败，请稍后重试。':'Could not generate analysis. Please try again.'}</span>}</span>;
}
