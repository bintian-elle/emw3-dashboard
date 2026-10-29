'use client';

import {useEffect,useState} from 'react';
import {AnimatePresence,motion,useReducedMotion} from 'motion/react';
import {Check,Share2} from 'lucide-react';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {testingShareHref} from '@/lib/testing-share-link';
import {redditSinceStartPreset} from '@/lib/reddit-testing-period';
import {useTestingPageShareScope} from './testing-ai';
import {NovaButton} from './nova-preview-ui';
import styles from './nova-share-button.module.css';

/** Copy the current page and the applied data period, with the reference design's feedback. */
export function NovaShareButton({disabled=false,freezePeriod=true,period}:{disabled?:boolean;freezePeriod?:boolean;period?:{start:string;end:string}}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const pageScope=useTestingPageShareScope(),reducedMotion=useReducedMotion();
 const [status,setStatus]=useState<'idle'|'copying'|'copied'|'error'>('idle');
 useEffect(()=>{if(status!=='copied')return;const timer=window.setTimeout(()=>setStatus('idle'),2000);return()=>window.clearTimeout(timer);},[status]);
 const copy=async()=>{
  setStatus('copying');
  try{
   const current=new URL(window.location.href);
   const isRedditLifetime=pageScope?.channel==='reddit'&&(!current.searchParams.get('period')||current.searchParams.get('period')===redditSinceStartPreset);
   const range=freezePeriod&&pageScope&&!isRedditLifetime?{start:pageScope.period.start,end:pageScope.period.end}:undefined;
   await navigator.clipboard.writeText(testingShareHref(current.toString(),range,range?period:undefined));
   setStatus('copied');
  }catch{setStatus('error');}
 };
 return <>
  <NovaButton type="button" variant="outline" className={styles.share} onClick={()=>void copy()} disabled={disabled||status==='copying'||!pageScope} aria-label={zh?'分享当前页面，复制链接':'Share this page, copy link'} title={status==='error'?(zh?'复制失败，请重试':'Could not copy. Try again'):(zh?'复制当前页面链接':'Copy page link')}>
   <span className={styles.feedback} aria-hidden="true"><AnimatePresence initial={false}><motion.span key={status==='copied'?'copied':'share'} className={styles.content} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reducedMotion?0:.12,ease:'linear'}}>{status==='copied'?<Check className={styles.success}/>:<Share2/>}{status==='copied'?(zh?'已复制':'Copied'):status==='error'?(zh?'重试复制':'Retry'):(zh?'分享':'Share')}</motion.span></AnimatePresence></span>
  </NovaButton>
  <span className={styles.srOnly} role="status">{status==='copied'?(zh?'当前页面链接已复制':'Page link copied'):status==='error'?(zh?'复制失败，请重试':'Could not copy. Please try again.'):''}</span>
 </>;
}
