'use client';
import Image from 'next/image';
import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {Button} from '@/components/base/buttons/button';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import styles from './page-notes.module.css';
export type RegionCapture={dataUrl:string;width:number;height:number};
type Point={x:number;y:number};
export function ScreenshotCapture({onCapture,onCancel}:{onCapture:(capture:RegionCapture,element:Element|null,point:Point)=>void;onCancel:()=>void}){
 const {language}=useSiteLanguage(),zh=language==='zh';
 const [image,setImage]=useState(''),[error,setError]=useState(false),[start,setStart]=useState<Point|null>(null),[end,setEnd]=useState<Point|null>(null);
 const canvas=useRef<HTMLCanvasElement|null>(null),overlay=useRef<HTMLDivElement>(null),cancel=useRef<HTMLButtonElement>(null),callbacks=useRef({onCapture,onCancel});
 useEffect(()=>{callbacks.current={onCapture,onCancel};},[onCapture,onCancel]);
 useEffect(()=>{
  const controller=new AbortController();let cancelled=false;const overflow=document.body.style.overflow;document.body.style.overflow='hidden';cancel.current?.focus();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')callbacks.current.onCancel();};const resize=()=>callbacks.current.onCancel();window.addEventListener('keydown',key);window.addEventListener('resize',resize);
  const timer=setTimeout(async()=>{try{
   const {default:render}=await import('html2canvas-pro');if(cancelled)return;
   const result=await render(document.documentElement,{scale:Math.min(1,2000/innerWidth,2000/innerHeight),width:innerWidth,height:innerHeight,x:scrollX,y:scrollY,scrollX,scrollY,useCORS:true,allowTaint:false,logging:false,imageTimeout:5000,signal:controller.signal,ignoreElements:element=>Boolean(element.closest('[data-page-notes]'))||element.tagName==='IFRAME'});
   if(!cancelled){canvas.current=result;setImage(result.toDataURL('image/jpeg',.9));}
  }catch{if(!cancelled)setError(true);}},100);
  return()=>{cancelled=true;controller.abort();clearTimeout(timer);document.body.style.overflow=overflow;window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);};
 },[]);
 const point=(event:PointerEvent)=>({x:Math.max(0,Math.min(innerWidth,event.clientX)),y:Math.max(0,Math.min(innerHeight,event.clientY))});
 const left=start&&end?Math.min(start.x,end.x):0,top=start&&end?Math.min(start.y,end.y):0,width=start&&end?Math.abs(end.x-start.x):0,height=start&&end?Math.abs(end.y-start.y):0;
 function finish(event:PointerEvent<HTMLDivElement>){
  if(!start||!canvas.current)return;const last=point(event),x=Math.min(start.x,last.x),y=Math.min(start.y,last.y),w=Math.abs(start.x-last.x),h=Math.abs(start.y-last.y);setStart(null);setEnd(null);if(w<16||h<16)return;
  const scale=Math.min(1,1280/w,960/h),crop=document.createElement('canvas');crop.width=Math.max(1,Math.round(w*scale));crop.height=Math.max(1,Math.round(h*scale));const context=crop.getContext('2d');if(!context)return;
  const source=canvas.current;context.drawImage(source,x*source.width/innerWidth,y*source.height/innerHeight,w*source.width/innerWidth,h*source.height/innerHeight,0,0,crop.width,crop.height);
  const center={x:x+w/2,y:y+h/2};if(overlay.current)overlay.current.style.pointerEvents='none';const element=document.elementFromPoint(center.x,center.y);if(overlay.current)overlay.current.style.pointerEvents='';
  callbacks.current.onCapture({dataUrl:crop.toDataURL('image/jpeg',.85),width:crop.width,height:crop.height},element,center);
 }
 return <div ref={overlay} data-page-notes className={styles.captureOverlay} role="dialog" aria-modal="true" aria-label={zh?'截图框选':'Capture a page region'} onPointerDown={event=>{if(!image||(event.target as Element).closest('button'))return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);const p=point(event);setStart(p);setEnd(p);}} onPointerMove={event=>{if(start)setEnd(point(event));}} onPointerUp={finish} onPointerCancel={()=>{setStart(null);setEnd(null);}}>
  {image&&<Image unoptimized src={image} alt="" fill className={styles.captureImage} draggable={false}/>}
  {start&&end&&<div className={styles.captureSelection} style={{left,top,width,height}}/>}
  <div className={styles.captureInstruction} role="status"><span>{error?(zh?'截图未能生成，请重试或使用页面批注。':'Could not capture this page. Retry or use a page note.'):image?(zh?'拖拽框选要批注的区域 · Esc 取消':'Drag to select an area · Esc to cancel'):(zh?'正在准备页面截图…':'Preparing page screenshot…')}</span><Button ref={cancel} size="small" variant="secondary" onClick={onCancel}>{zh?'取消':'Cancel'}</Button></div>
 </div>;
}
