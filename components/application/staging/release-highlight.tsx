'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {X} from 'lucide-react';
import {Button} from '@/components/base/buttons/button';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {reviewChangeFromHash,type StagingReviewChange} from '@/lib/staging-review-changes';
import styles from './page-notes.module.css';
type Highlight={change:StagingReviewChange;status:'locating'|'found'|'missing';rect?:{left:number;top:number;width:number;height:number}};
export function ReleaseHighlight({changes}:{changes:StagingReviewChange[]}){
 const page=usePathname(),{language}=useSiteLanguage(),zh=language==='zh';
 const [highlight,setHighlight]=useState<Highlight|null>(null);
 useEffect(()=>{
  let poll:ReturnType<typeof setInterval>|undefined,expiry:ReturnType<typeof setTimeout>|undefined,observer:ResizeObserver|undefined,selected:StagingReviewChange|undefined,element:HTMLElement|undefined,restoreFocus:(()=>void)|undefined;
  const clear=()=>{clearInterval(poll);clearTimeout(expiry);observer?.disconnect();restoreFocus?.();restoreFocus=undefined;element=undefined;};
  const update=()=>{if(!element||!selected)return;const rect=element.getBoundingClientRect();const left=Math.max(4,rect.left-4),top=Math.max(4,rect.top-4);setHighlight({change:selected,status:'found',rect:{left,top,width:Math.max(0,Math.min(innerWidth-4,rect.right+4)-left),height:Math.max(0,Math.min(innerHeight-4,rect.bottom+4)-top)}});};
  const start=()=>{
   clear();selected=reviewChangeFromHash(window.location.hash);if(!selected||selected.page!==page||!changes.some(change=>change.id===selected?.id)){setHighlight(null);return;}
   const change=selected;setHighlight({change,status:'locating'});const deadline=Date.now()+20000;
   const find=()=>{
    const targets=Array.from(document.querySelectorAll<HTMLElement>(`[data-review-target="${change.target}"]`));
    const target=targets.find(candidate=>{const rect=candidate.getBoundingClientRect();return rect.width>0&&rect.height>0&&getComputedStyle(candidate).visibility!=='hidden';});
    if(target){
     clearInterval(poll);element=target;const margin=target.style.scrollMarginTop;target.style.scrollMarginTop=innerWidth<=600?'176px':'96px';target.scrollIntoView({behavior:'instant',block:target.getBoundingClientRect().height>innerHeight/2?'start':'center',inline:'nearest'});
     const previous=target.getAttribute('tabindex');if(previous===null)target.setAttribute('tabindex','-1');target.focus({preventScroll:true});restoreFocus=()=>{if(previous===null)target.removeAttribute('tabindex');target.style.scrollMarginTop=margin;};
     update();observer=new ResizeObserver(update);observer.observe(target);expiry=setTimeout(()=>{clear();setHighlight(null);},15000);return;
    }
    if(change.reveal==='analysis'){
     const button=document.querySelector<HTMLButtonElement>('[data-review-reveal="analysis"][aria-expanded="false"]');if(button&&!button.disabled)button.click();
    }
    if(Date.now()>deadline){clearInterval(poll);setHighlight({change,status:'missing'});}
   };
   find();if(!element)poll=setInterval(find,250);
  };
  const initial=setTimeout(start,0);window.addEventListener('hashchange',start);window.addEventListener('scroll',update,true);window.addEventListener('resize',update);
  return()=>{clearTimeout(initial);clear();window.removeEventListener('hashchange',start);window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);};
 },[changes,page]);
 function dismiss(){if(reviewChangeFromHash(window.location.hash))history.replaceState(null,'',window.location.pathname+window.location.search);window.dispatchEvent(new HashChangeEvent('hashchange'));}
 if(!highlight)return null;
 const {change,status,rect}=highlight;
 return <>
  {rect&&rect.width>0&&rect.height>0&&<div data-page-notes data-review-highlight={change.id} className={styles.highlight} style={rect} aria-hidden="true"/>}
  <div data-page-notes className={styles.highlightNotice} role="status"><div><strong>{status==='locating'?(zh?'正在定位修改…':'Locating change…'):status==='missing'?(zh?'此处暂时无法定位':'Change is currently unavailable'):change.title[zh?'zh':'en']}</strong><p>{status==='missing'?(zh?'当前数据或页面状态未显示这部分内容。可稍后重试，或在团队批注中留言。':'This content is unavailable in the current data or page state. Try again later or leave a team note.'):change.description[zh?'zh':'en']}</p></div><Button variant="ghost" size="small" iconOnly leadingIcon={X} aria-label={zh?'关闭修改高亮':'Dismiss change highlight'} onClick={dismiss}/></div>
 </>;
}
