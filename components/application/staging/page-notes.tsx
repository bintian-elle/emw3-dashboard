"use client";
import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { MessageSquare, MapPin, Plus, X, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { useSiteLanguage } from '@/components/application/dashboard/site-language-provider';
import type { StagingReleaseState, StagingReleaseSummary } from '@/lib/staging-release';
import type { NoteAnchor, PageNote } from '@/lib/staging-notes';
import styles from './page-notes.module.css';
function selectorFor(element:Element){
 const parts:string[]=[];let current:Element|null=element;
 while(current&&current!==document.body&&parts.length<12){
  if(current.id){parts.unshift(`#${CSS.escape(current.id)}`);break;}
  const parent:Element|null=current.parentElement;
  if(!parent)break;
  parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${Array.from(parent.children).indexOf(current)+1})`);current=parent;
 }
 return parts.join(' > ');
}
function anchoredElement(anchor:NoteAnchor){
 try{const element=document.querySelector(anchor.selector);if(!element)return null;
 // A changed layout must not silently attach feedback to unrelated content.
 if(anchor.context && !(element.textContent||'').replace(/\s+/g,' ').trim().startsWith(anchor.context))return null;
 return element;
 }catch{return null;}
}
export function PageNotes({name}:{name:string}){
 const page=usePathname();
 return <PageNotesPage key={page} name={name}/>;
}
function PageNotesPage({name}:{name:string}){
 const page=usePathname(),{language}=useSiteLanguage(),zh=language==='zh';
 const [releaseState,setReleaseState]=useState<StagingReleaseState|'loading'>('loading');
 const [releaseSummary,setReleaseSummary]=useState<StagingReleaseSummary>({});
 const [notes,setNotes]=useState<PageNote[]>([]),[open,setOpen]=useState(false),[selecting,setSelecting]=useState(false),[draft,setDraft]=useState(false),[anchor,setAnchor]=useState<NoteAnchor|null>(null),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[active,setActive]=useState<string|null>(null),[pins,setPins]=useState<{id:string;x:number;y:number}[]>([]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const response=await fetch(`/api/staging/notes?page=${encodeURIComponent(page)}`,{cache:'no-store',signal});if(!response.ok)throw Error();const body=await response.json();if(!signal?.aborted){setNotes(body.notes);if(['synced','pending','unknown'].includes(body.release?.state))setReleaseState(body.release.state);else setReleaseState('unknown');setReleaseSummary(body.release?.state==='pending'?body.release.summary||{}:{});setLoaded(true);setError('');}}
  catch{if(!signal?.aborted)setError(zh?'批注未能加载，请重试。':'Could not load notes. Please retry.');}
 },[page,zh]);
 useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>void load(controller.signal),0);const interval=setInterval(()=>{if(!document.hidden)void load(controller.signal);},30000);return()=>{clearTimeout(timer);clearInterval(interval);controller.abort();};},[load]);
 useEffect(()=>{
  const update=()=>setPins(notes.filter(n=>!n.resolved&&n.anchor).flatMap(n=>{const a=n.anchor!,el=anchoredElement(a);if(!el)return [];const r=el.getBoundingClientRect();if(!r.width||!r.height)return [];return [{id:n.id,x:r.left+r.width*a.x,y:r.top+r.height*a.y}];}));
  const frame=requestAnimationFrame(update);window.addEventListener('scroll',update,true);window.addEventListener('resize',update);const observer=new ResizeObserver(update);observer.observe(document.body);return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);observer.disconnect();};
 },[notes]);
 useEffect(()=>{
  if(!selecting)return;
  const click=(event:MouseEvent)=>{
   const element=event.target as Element;if(element.closest('[data-page-notes]'))return;
   event.preventDefault();event.stopPropagation();const r=element.getBoundingClientRect();
   const selected={selector:selectorFor(element),x:Math.max(0,Math.min(1,(event.clientX-r.left)/(r.width||1))),y:Math.max(0,Math.min(1,(event.clientY-r.top)/(r.height||1))),context:(element.textContent||'').replace(/\s+/g,' ').trim().slice(0,180)};
   setAnchor(selected);setSelecting(false);setDraft(true);setOpen(true);
  };
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setSelecting(false);};
  document.addEventListener('click',click,true);document.addEventListener('keydown',key);document.body.classList.add(styles.selecting);
  return()=>{document.removeEventListener('click',click,true);document.removeEventListener('keydown',key);document.body.classList.remove(styles.selecting);};
 },[selecting]);
 async function mutate(method:'POST'|'PATCH',body:unknown){
  setBusy(true);setError('');try{const response=await fetch('/api/staging/notes',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error();const {note}=await response.json();setNotes(previous=>method==='POST'?[...previous,note]:previous.map(n=>n.id===note.id?note:n));if(method==='POST'){setDraft(false);setText('');setAnchor(null);setActive(note.id);}}catch{setError(zh?'未能保存，请重试。':'Could not save. Please retry.');}finally{setBusy(false);}
 }
 useEffect(()=>{if(!open||!active)return;const frame=requestAnimationFrame(()=>document.querySelector(`[data-note-id="${active}"]`)?.scrollIntoView({block:'nearest'}));return()=>cancelAnimationFrame(frame);},[open,active,notes.length]);
 const releaseLabel=releaseState==='synced'?(zh?'与正式站同版本 · 暂无更新':'Same as production · No pending updates'):releaseState==='pending'?(zh?'有待验收更新':'Updates ready for review'):releaseState==='loading'?(zh?'正在核对版本…':'Checking version…'):(zh?'版本待确认':'Version not confirmed');
 const summary=releaseState==='pending'?(zh?releaseSummary.zh||releaseSummary.en:releaseSummary.en||releaseSummary.zh):undefined;
 const startDraft=()=>{setText('');setAnchor(null);setDraft(true);setActive(null);};
 return <>
  <div data-page-notes className={styles.toolbar}><span aria-live="polite" title={zh?"测试站始终可以批注；版本标记根据实际发布记录判断。":"Team notes are always available. Version status follows the recorded published release."}>Staging · {releaseLabel}{summary&&<small className={styles.releaseSummary} title={summary}>{summary}</small>}</span><Button variant="secondary" size="small" leadingIcon={MessageSquare} onClick={()=>setOpen(true)}>{zh?'团队批注':'Team notes'}{loaded?` · ${notes.filter(n=>!n.resolved).length}`:''}</Button></div>
  {selecting&&<div data-page-notes className={styles.instruction} role="status">{zh?'点击页面上的位置添加批注 · Esc 取消':'Click a spot on the page to add a note · Esc to cancel'}<Button variant="secondary" size="small" onClick={()=>setSelecting(false)}>{zh?'取消':'Cancel'}</Button></div>}
  {pins.map(pin=><button data-page-notes key={pin.id} className={styles.pin} style={{left:pin.x,top:pin.y}} aria-label={`${zh?'打开批注':'Open note'}: ${notes.find(n=>n.id===pin.id)?.author.name}`} onClick={()=>{setActive(pin.id);setDraft(false);setOpen(true);}}><MapPin size={16}/><span>{notes.findIndex(n=>n.id===pin.id)+1}</span></button>)}
  <Dialog.Root open={open} onOpenChange={value=>{setOpen(value);if(!value){setDraft(false);setActive(null);}}}>
   <Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content data-page-notes className={styles.panel}>
    <div className={styles.heading}><div><Dialog.Title className={styles.title}>{zh?'团队批注':'Team notes'}</Dialog.Title><Dialog.Description className={styles.description}>{page} · {releaseLabel}<br/>{zh?'以登录账号署名，团队共享':'Shared with the team, signed with your account'}</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="small" iconOnly leadingIcon={X} aria-label={zh?'关闭':'Close'}/></Dialog.Close></div>
    {summary&&<section className={styles.releaseDetails} aria-label={zh?'本次更新':'What changed'}><strong>{zh?'本次更新':'What changed'}</strong><p>{summary}</p></section>}
    <div className={styles.actions}><Button size="small" leadingIcon={MapPin} onClick={()=>{setOpen(false);setDraft(false);setSelecting(true);}}>{zh?'标记页面位置':'Mark a spot'}</Button><Button variant="secondary" size="small" leadingIcon={Plus} onClick={startDraft}>{zh?'页面批注':'Page note'}</Button><Button variant="ghost" size="small" iconOnly leadingIcon={RefreshCw} aria-label={zh?'刷新':'Refresh'} onClick={()=>void load()}/></div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {draft&&<form className={styles.composer} onSubmit={event=>{event.preventDefault();void mutate('POST',{page,text,anchor});}}><strong>{name}</strong>{anchor&&<p className={styles.context}>{anchor.context|| (zh?'页面标记':'Page marker')}</p>}<label htmlFor="page-note-text">{zh?'批注内容':'Note'}</label><textarea id="page-note-text" autoFocus required maxLength={2000} value={text} onChange={event=>setText(event.target.value)} rows={4}/><div className={styles.actions}><Button size="small" type="submit" disabled={busy||!text.trim()}>{busy?(zh?'保存中…':'Saving…'):(zh?'保存批注':'Save note')}</Button><Button variant="ghost" size="small" disabled={busy} onClick={()=>setDraft(false)}>{zh?'取消':'Cancel'}</Button></div></form>}
    <div className={styles.list} aria-live="polite">{!loaded&&!error?<p>{zh?'加载中…':'Loading…'}</p>:notes.length===0?<p className={styles.empty}>{zh?'此页面还没有批注。标记一个位置，或添加页面批注。':'No notes on this page yet. Mark a spot or add a page note.'}</p>:notes.map((note,index)=><article key={note.id} data-note-id={note.id} className={styles.note} data-active={note.id===active} data-resolved={note.resolved}><div className={styles.meta}><strong>{index+1}. {note.author.name}</strong><span>{note.resolved?(zh?'已解决':'Resolved'):(zh?'待处理':'Open')}</span></div><small>{note.author.email} · {new Date(note.createdAt).toLocaleString(zh?'zh-CN':'en-US')}</small>{note.anchor&&<button className={styles.context} onClick={()=>{const el=anchoredElement(note.anchor!);if(el){setOpen(false);el.scrollIntoView({behavior:'instant',block:'center'});}else setError(zh?'页面内容已改变，请参考记录的位置文字。':'Page content has changed. Refer to the saved context.');}}>{note.anchor.context|| (zh?'页面标记':'Page marker')}</button>}<p className={styles.body}>{note.text}</p><Button size="small" variant="ghost" leadingIcon={Check} disabled={busy} onClick={()=>void mutate('PATCH',{id:note.id,resolved:!note.resolved})}>{note.resolved?(zh?'重新打开':'Reopen'):(zh?'标为已解决':'Resolve')}</Button></article>)}</div>
   </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
 </>;
}
