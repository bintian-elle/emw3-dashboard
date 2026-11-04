'use client';
import {useEffect,useRef,useState} from 'react';
import {usePathname} from 'next/navigation';
import {X} from 'lucide-react';
import {Button} from '@/components/base/buttons/button';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {reviewChangeFromHash,type StagingReviewChange} from '@/lib/staging-review-changes';
import type {PageNote} from '@/lib/staging-notes';
import styles from './page-notes.module.css';
type Target=StagingReviewChange&{note?:PageNote};
type Highlight={change:Target;status:'locating'|'found'|'missing'|'page';rect?:{left:number;top:number;width:number;height:number}};
export function ReleaseHighlight({changes,notes,onOpenNote}:{changes:StagingReviewChange[];notes:PageNote[];onOpenNote:(id:string)=>void}){
 const page=usePathname(),{language}=useSiteLanguage(),zh=language==='zh';
 const [highlight,setHighlight]=useState<Highlight|null>(null);
 const data=useRef({notes,onOpenNote});
 useEffect(()=>{data.current={notes,onOpenNote};window.dispatchEvent(new Event('review-notes-ready'));},[notes,onOpenNote]);
 useEffect(()=>{
  let poll:ReturnType<typeof setInterval>|undefined,expiry:ReturnType<typeof setTimeout>|undefined,observer:ResizeObserver|undefined,selected:Target|undefined,element:HTMLElement|undefined,restoreFocus:(()=>void)|undefined,handledHash:string|undefined;
  const clear=()=>{clearInterval(poll);clearTimeout(expiry);observer?.disconnect();restoreFocus?.();restoreFocus=undefined;element=undefined;};
  const update=()=>{if(!element||!selected)return;const rect=element.getBoundingClientRect();const left=Math.max(4,rect.left-4),top=Math.max(4,rect.top-4);setHighlight({change:selected,status:'found',rect:{left,top,width:Math.max(0,Math.min(innerWidth-4,rect.right+4)-left),height:Math.max(0,Math.min(innerHeight-4,rect.bottom+4)-top)}});};
  const start=(explicit=false)=>{
   const hash=window.location.hash,noteId=/^#review-note=([0-9a-f-]{36})$/.exec(hash)?.[1];
   const note=noteId?data.current.notes.find(item=>item.id===noteId):undefined;
   if(noteId&&!note){if(selected?.note){clear();setHighlight(null);}return;}
   if(!explicit&&handledHash===hash)return;
   clear();selected=note?{id:'note-'+note.id,page:note.page,target:'',reveal:'analysis',note,title:{zh:note.author.name+' 的批注',en:'Note by '+note.author.name},description:{zh:note.text.slice(0,180),en:note.text.slice(0,180)}}:reviewChangeFromHash(hash);
   if(!selected||selected.page!==page||(!selected.note&&!changes.some(change=>change.id===selected?.id))){setHighlight(null);return;}
   handledHash=hash;const change=selected;
   if(change.note&&!change.note.anchor){setHighlight({change,status:'page'});return;}
   setHighlight({change,status:'locating'});const deadline=Date.now()+20000;
   const find=()=>{
    let targets:HTMLElement[]=[];try{targets=Array.from(document.querySelectorAll<HTMLElement>(change.note?.anchor?.selector||`[data-review-target="${change.target}"]`));}catch{/* Keep the note when its old selector is invalid. */}
    const target=targets.find(candidate=>{const rect=candidate.getBoundingClientRect(),context=change.note?.anchor?.context;return rect.width>0&&rect.height>0&&getComputedStyle(candidate).visibility!=='hidden'&&(!context||(candidate.textContent||'').replace(/\s+/g,' ').trim().startsWith(context));});
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
  const hashChange=()=>start(true),ready=()=>start();const initial=setTimeout(ready,0);window.addEventListener('hashchange',hashChange);window.addEventListener('review-notes-ready',ready);window.addEventListener('scroll',update,true);window.addEventListener('resize',update);
  return()=>{clearTimeout(initial);clear();window.removeEventListener('hashchange',hashChange);window.removeEventListener('review-notes-ready',ready);window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);};
 },[changes,page]);
 function dismiss(){if(reviewChangeFromHash(window.location.hash)||window.location.hash.startsWith('#review-note='))history.replaceState(null,'',window.location.pathname+window.location.search);window.dispatchEvent(new HashChangeEvent('hashchange'));}
 if(!highlight)return null;
 const {change,status,rect}=highlight;
 return <>
  {rect&&rect.width>0&&rect.height>0&&<div data-page-notes data-review-highlight={change.id} className={styles.highlight} style={rect} aria-hidden="true"/>}
  <div data-page-notes className={styles.highlightNotice} role="status"><div><strong>{status==='locating'?(zh?'正在定位…':'Locating…'):status==='missing'?(zh?'此处暂时无法定位':'Location is currently unavailable'):change.title[zh?'zh':'en']}</strong><p>{status==='missing'?(change.note?(zh?'页面内容已改变或尚未显示，请查看批注截图确认原位置。':'Page content has changed or is unavailable. Check the saved screenshot for its original location.'):(zh?'当前数据或页面状态未显示这部分内容。可稍后重试，或在团队批注中留言。':'This content is unavailable in the current data or page state. Try again later or leave a team note.')):change.description[zh?'zh':'en']}</p>{change.note&&<Button size="small" variant="secondary" onClick={()=>data.current.onOpenNote(change.note!.id)}>{zh?'查看批注':'View note'}</Button>}</div><Button variant="ghost" size="small" iconOnly leadingIcon={X} aria-label={zh?'关闭定位高亮':'Dismiss change highlight'} onClick={dismiss}/></div>
 </>;
}
