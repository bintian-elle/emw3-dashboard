'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import styles from '../channel-content.module.css';

type CoverageStatus='loading'|'failed'|'rate_limited'|'unavailable';
export function SocialCoverageNotice(){
 const [status,setStatus]=useState<CoverageStatus>('loading'),router=useRouter(),{language}=useSiteLanguage(),zh=language==='zh';
 useEffect(()=>{
  let cancelled=false;let timer:ReturnType<typeof setTimeout>|undefined;const controller=new AbortController();
  const check=async()=>{
   try{
    const response=await fetch('/api/testing/social-coverage',{cache:'no-store',signal:controller.signal});
    if(!response.ok)throw Error('unavailable');
    const data=await response.json() as {status:CoverageStatus|'complete'|'retry'};
    if(cancelled)return;
    if(data.status==='complete'||data.status==='retry'){router.refresh();timer=setTimeout(()=>void check(),5000);return;}
    setStatus(data.status);
    timer=setTimeout(()=>void check(),data.status==='loading'?3000:30000);
   }catch{if(!cancelled){setStatus('unavailable');timer=setTimeout(()=>void check(),30000);}}
  };
  void check();return()=>{cancelled=true;controller.abort();if(timer)clearTimeout(timer);};
 },[router]);
 const message=status==='loading'?(zh?'正在获取缺失的帖子数据，已有数据仍可查看。':'Getting missing post data; existing data remains available.'):
  status==='rate_limited'?(zh?'Meta API 达到限额，请稍后再试；已有数据已保留。':'Meta API rate limit reached. Please try again later; existing data is preserved.'):
  (zh?'部分帖子数据暂时无法获取，请稍后再试；已有数据已保留。':'Some post data is temporarily unavailable. Please try again later; existing data is preserved.');
 return <p role="status" className={styles.notice}>{message}</p>;
}
