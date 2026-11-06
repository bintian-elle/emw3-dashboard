"use client";
import Image from 'next/image';
import { Suspense,useCallback, useEffect, useState,type MouseEvent } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { MessageSquare, MapPin, Plus, X, Check, RefreshCw, Trash2, Camera } from 'lucide-react';
import { Button } from '@/components/base/buttons/button';
import { useSiteLanguage } from '@/components/application/dashboard/site-language-provider';
import type { StagingReleaseState, StagingReleaseSummary } from '@/lib/staging-release';
import type { NoteAnchor, PageNote } from '@/lib/staging-notes';
import {reviewChanges,reviewChangeHref,type StagingReviewChange} from '@/lib/staging-review-changes';
import {ScreenshotCapture,type RegionCapture} from './screenshot-capture';
import {ProductionReturnButton} from './review-button';
import {ReleaseHighlight} from './release-highlight';
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
 const [changes,setChanges]=useState<StagingReviewChange[]>([]);
 const [releaseSummary,setReleaseSummary]=useState<StagingReleaseSummary>({});
 const [capture,setCapture]=useState<RegionCapture|null>(null),[deleting,setDeleting]=useState<string|null>(null);
 const [notes,setNotes]=useState<PageNote[]>([]),[open,setOpen]=useState(false),[selecting,setSelecting]=useState(false),[draft,setDraft]=useState(false),[anchor,setAnchor]=useState<NoteAnchor|null>(null),[text,setText]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false),[active,setActive]=useState<string|null>(null),[pins,setPins]=useState<{id:string;x:number;y:number}[]>([]);
 const load=useCallback(async(signal?:AbortSignal)=>{
  try{const response=await fetch('/api/staging/notes?scope=all',{cache:'no-store',signal});if(!response.ok)throw Error();const body=await response.json();if(!signal?.aborted){setNotes(previous=>JSON.stringify(previous)===JSON.stringify(body.notes)?previous:body.notes);if(['synced','pending','unknown','local'].includes(body.release?.state))setReleaseState(body.release.state);else setReleaseState('unknown');setReleaseSummary(body.release?.state==='pending'?body.release.summary||{}:{});const nextChanges=body.release?.state==='pending'?reviewChanges(body.release.changes?.map((change:StagingReviewChange)=>change.id)):[];setChanges(previous=>previous.map(change=>change.id).join(',')===nextChanges.map(change=>change.id).join(',')?previous:nextChanges);setLoaded(true);setError('');}}
  catch{if(!signal?.aborted)setError(zh?'批注未能加载，请重试。':'Could not load notes. Please retry.');}
 },[zh]);
 useEffect(()=>{const controller=new AbortController();const timer=setTimeout(()=>void load(controller.signal),0);const refresh=()=>void load(controller.signal);window.addEventListener('hashchange',refresh);const interval=setInterval(()=>{if(!document.hidden)void load(controller.signal);},30000);return()=>{clearTimeout(timer);clearInterval(interval);window.removeEventListener('hashchange',refresh);controller.abort();};},[load]);
 useEffect(()=>{
  const update=()=>setPins(notes.filter(n=>n.page===page&&!n.resolved&&n.anchor).flatMap(n=>{const a=n.anchor!,el=anchoredElement(a);if(!el)return [];const r=el.getBoundingClientRect();if(!r.width||!r.height)return [];return [{id:n.id,x:r.left+r.width*a.x,y:r.top+r.height*a.y}];}));
  const frame=requestAnimationFrame(update);window.addEventListener('scroll',update,true);window.addEventListener('resize',update);const observer=new ResizeObserver(update);observer.observe(document.body);return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',update,true);window.removeEventListener('resize',update);observer.disconnect();};
 },[notes,page]);
 async function mutate(method:'POST'|'PATCH',body:unknown){
  setBusy(true);setError('');try{const response=await fetch('/api/staging/notes',{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!response.ok)throw Error();const {note}=await response.json();setNotes(previous=>method==='POST'?[...previous,note]:previous.map(n=>n.id===note.id?note:n));if(method==='POST'){setDraft(false);setText('');setAnchor(null);setCapture(null);setActive(note.id);}}catch{setError(zh?'未能保存，请重试。':'Could not save. Please retry.');}finally{setBusy(false);}
 }
 useEffect(()=>{if(!open||!active)return;const frame=requestAnimationFrame(()=>document.querySelector(`[data-note-id="${active}"]`)?.scrollIntoView({block:'nearest'}));return()=>cancelAnimationFrame(frame);},[open,active,notes.length]);
 const releaseLabel=releaseState==='local'?(zh?'本地正式站验收中 · 暂无待验收更新':'Local production review · No pending updates'):releaseState==='pending'?(zh?'有待验收更新':'Updates ready for review'):releaseState==='loading'?(zh?'正在加载…':'Loading…'):(zh?'暂无待验收更新':'No pending updates');
 const summary=releaseState==='pending'?(zh?releaseSummary.zh||releaseSummary.en:releaseSummary.en||releaseSummary.zh):undefined;
 const startDraft=()=>{setText('');setAnchor(null);setCapture(null);setDraft(true);setActive(null);};
 async function removeNote(id:string){setBusy(true);setError('');try{const response=await fetch('/api/staging/notes',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!response.ok)throw Error();setNotes(previous=>previous.filter(note=>note.id!==id));setDeleting(null);}catch{setError(zh?'未能删除。只有创建者和管理员可以删除批注。':'Could not delete. Only its creator and the administrator can delete this note.');}finally{setBusy(false);}}
 function goToNote(event:MouseEvent<HTMLAnchorElement>,note:PageNote){if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;setOpen(false);if(note.page===page){event.preventDefault();history.pushState(null,'',note.page+'#review-note='+note.id);setTimeout(()=>window.dispatchEvent(new HashChangeEvent('hashchange')),0);}}
 const startCapture=()=>{setOpen(false);setDraft(false);setSelecting(true);setActive(null);};
 return <>
  <div data-page-notes className={styles.exitStaging}><Suspense fallback={null}><ProductionReturnButton language={language}/></Suspense></div>
  <ReleaseHighlight changes={changes} notes={notes} onOpenNote={id=>{setActive(id);setDraft(false);setOpen(true);}}/>
  <div data-page-notes data-review-target="team-feedback" className={styles.toolbar}><button type="button" className={styles.releaseButton} aria-label={zh?'查看本次修改':'View release changes'} onClick={()=>setOpen(true)} title={zh?"测试站始终可以批注；更新状态由发布流程记录。":"Team notes are always available. The deployment process records the review status."}>Staging · {releaseLabel}{summary&&<small className={styles.releaseSummary} title={summary}>{summary}</small>}{changes.length>0&&<strong className={styles.changeEntry}>{zh?'查看修改':'View changes'} · {changes.length} <span aria-hidden="true">→</span></strong>}</button><Button variant="secondary" size="small" leadingIcon={MessageSquare} onClick={()=>setOpen(true)}>{zh?'团队批注':'Team notes'}{loaded?` · ${notes.filter(n=>!n.resolved).length}`:''}</Button></div>
  {selecting&&<ScreenshotCapture onCancel={()=>{setSelecting(false);setDraft(Boolean(capture)||Boolean(text.trim()));setOpen(true);}} onCapture={(image,element,point)=>{setCapture(image);if(element&&selectorFor(element)&&!element.closest('[data-page-notes]')){const rect=element.getBoundingClientRect();setAnchor({selector:selectorFor(element),x:Math.max(0,Math.min(1,(point.x-rect.left)/(rect.width||1))),y:Math.max(0,Math.min(1,(point.y-rect.top)/(rect.height||1))),context:(element.textContent||'').replace(/\s+/g,' ').trim().slice(0,180)});}else setAnchor(null);setSelecting(false);setDraft(true);setOpen(true);}}/>}
  {pins.map(pin=><button data-page-notes key={pin.id} className={styles.pin} style={{left:pin.x,top:pin.y}} aria-label={`${zh?'打开批注':'Open note'}: ${notes.find(n=>n.id===pin.id)?.author.name}`} onClick={()=>{setActive(pin.id);setDraft(false);setOpen(true);}}><MapPin size={16}/><span>{notes.findIndex(n=>n.id===pin.id)+1}</span></button>)}
  <Dialog.Root open={open} onOpenChange={value=>{setOpen(value);if(!value){setDraft(false);setActive(null);}}}>
   <Dialog.Portal><Dialog.Overlay className={styles.overlay}/><Dialog.Content data-page-notes className={styles.panel}>
    <div className={styles.heading}><div><Dialog.Title className={styles.title}>{zh?'测试验收':'Staging review'}</Dialog.Title><Dialog.Description className={styles.description}>{releaseLabel}</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="small" iconOnly leadingIcon={X} aria-label={zh?'关闭':'Close'}/></Dialog.Close></div>
    {(summary||changes.length>0)&&!draft&&<section className={styles.releaseDetails} aria-label={zh?'本次更新':'What changed'}><h3 className={styles.sectionTitle}>{zh?'本次更新':'What changed'}</h3>{summary&&<p>{summary}</p>}
    {changes.length>0&&<nav className={styles.changeList} aria-label={zh?'修改位置':'Changed areas'}>{changes.map(change=><a key={change.id} href={reviewChangeHref(change)} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){setOpen(false);if(change.page===page){event.preventDefault();history.pushState(null,'',reviewChangeHref(change));setTimeout(()=>window.dispatchEvent(new HashChangeEvent('hashchange')),0);}}}}><strong>{change.title[zh?'zh':'en']} ↗</strong><span>{change.description[zh?'zh':'en']}</span></a>)}</nav>}</section>}
    <section className={styles.notesSection} aria-label={zh?'团队批注':'Team notes'}><div><h3 className={styles.sectionTitle}>{zh?'团队批注':'Team notes'}</h3><p className={styles.description}>{zh?'全站批注 · 点击所属页面跳转 · 以登录账号署名':'All pages · Click a page to locate a note · Signed with your account'}</p></div>
    <div className={styles.actions}><Button size="small" leadingIcon={Camera} onClick={startCapture}>{zh?'截图标记页面':'Capture a region'}</Button><Button variant="secondary" size="small" leadingIcon={Plus} onClick={startDraft}>{zh?'页面批注':'Page note'}</Button><Button variant="ghost" size="small" iconOnly leadingIcon={RefreshCw} aria-label={zh?'刷新':'Refresh'} onClick={()=>void load()}/></div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {draft&&<form className={styles.composer} onSubmit={event=>{event.preventDefault();void mutate('POST',{page,text,anchor,...(capture?{captureDataUrl:capture.dataUrl}:{})});}}><strong>{name}</strong>{capture&&<div><Image unoptimized className={styles.capturePreview} src={capture.dataUrl} width={capture.width} height={capture.height} alt={zh?'框选区域预览':'Selected region preview'}/><Button variant="ghost" size="small" leadingIcon={Camera} onClick={startCapture}>{zh?'重新框选':'Retake screenshot'}</Button></div>}{anchor&&!capture&&<p className={styles.context}>{anchor.context|| (zh?'页面标记':'Page marker')}</p>}<label htmlFor="page-note-text">{zh?'批注内容':'Note'}</label><textarea id="page-note-text" autoFocus required maxLength={2000} value={text} onChange={event=>setText(event.target.value)} rows={4}/><div className={styles.actions}><Button size="small" type="submit" disabled={busy||!text.trim()}>{busy?(zh?'保存中…':'Saving…'):(zh?'保存批注':'Save note')}</Button><Button variant="ghost" size="small" disabled={busy} onClick={()=>setDraft(false)}>{zh?'取消':'Cancel'}</Button></div></form>}
    <div className={styles.list} aria-live="polite">{!loaded&&!error?<p>{zh?'加载中…':'Loading…'}</p>:notes.length===0?<p className={styles.empty}>{zh?'还没有批注。截图框选一个区域，或添加页面批注。':'No notes yet. Capture a region or add a page note.'}</p>:notes.map((note,index)=><article key={note.id} data-note-id={note.id} className={styles.note} data-active={note.id===active} data-resolved={note.resolved}><div className={styles.meta}><strong>{index+1}. {note.author.name}</strong><span>{note.resolved?(zh?'已读':'Read'):(zh?'未读':'Unread')}</span></div><small>{note.author.email} · {new Date(note.createdAt).toLocaleString(zh?'zh-CN':'en-US')}</small><a className={styles.notePage} href={note.page+'#review-note='+note.id} onClick={event=>goToNote(event,note)}><MapPin size={13} aria-hidden="true"/>{zh?'页面':'Page'}: {note.page==='/'?(zh?'工作区主页':'Workspaces'):note.page}</a>{note.anchor&&!note.capture&&<p className={styles.context}>{note.anchor.context}</p>}{note.capture&&<a href={`/api/staging/notes/image?id=${note.id}`} target="_blank" rel="noopener noreferrer" aria-label={zh?'打开批注截图':'Open note screenshot'}><Image unoptimized className={styles.capturePreview} src={`/api/staging/notes/image?id=${note.id}`} width={note.capture.width} height={note.capture.height} alt={zh?`${note.author.name} 的页面截图`:`Page screenshot by ${note.author.name}`}/></a>}<p className={styles.body}>{note.text}</p><Button size="small" variant="ghost" leadingIcon={Check} disabled={busy} onClick={()=>void mutate('PATCH',{id:note.id,resolved:!note.resolved})}>{note.resolved?(zh?'标为未读':'Mark as unread'):(zh?'标为已读':'Mark as read')}</Button>{note.canDelete&&(deleting===note.id?<div className={styles.actions}><span>{zh?'删除这条批注和截图？':'Delete this note and screenshot?'}</span><Button variant="secondary" size="small" disabled={busy} onClick={()=>void removeNote(note.id)}>{zh?'确认删除':'Confirm delete'}</Button><Button variant="ghost" size="small" onClick={()=>setDeleting(null)}>{zh?'取消':'Cancel'}</Button></div>:<Button variant="ghost" size="small" leadingIcon={Trash2} onClick={()=>setDeleting(note.id)}>{zh?'删除':'Delete'}</Button>)}</article>)}</div>
    </section>
   </Dialog.Content></Dialog.Portal>
  </Dialog.Root>
 </>;
}
