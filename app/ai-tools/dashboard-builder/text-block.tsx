'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {TextArea} from 'react-aria-components';
import {TextField} from '@/components/base/input/input';
import type {TextBlock as TextBlockData} from '@/lib/ai-dashboard-text';
export type TextChange={title?:string;content?:string};
export function TextBlock({widget,editable,focusOnMount=false,onChange}:{widget:TextBlockData;editable:boolean;focusOnMount?:boolean;onChange?:(change:TextChange)=>void}){
 const [draft,setDraft]=useState(widget.content),[title,setTitle]=useState(widget.title),area=useRef<HTMLTextAreaElement>(null),heading=useRef<HTMLTextAreaElement>(null),cancel=useRef(false);
 useLayoutEffect(()=>{for(const element of [area.current,heading.current])if(element){element.style.height='0px';element.style.height=Math.max(element===heading.current?24:48,element.scrollHeight)+'px';}},[draft,title]);
 return <section className="dashboard-report-card dashboard-text-card rounded-3xl border border-border-button-default bg-background-primary-default p-5">
  <header className="dashboard-component-heading mb-3 flex items-start gap-3">
   <TextField aria-label={`Title for ${widget.title}`} value={title} onChange={setTitle} isReadOnly={!editable}>
    <TextArea ref={heading} aria-label={`Title for ${widget.title}`} rows={1} maxLength={150} className="dashboard-text-title block min-h-6 w-full resize-none overflow-hidden rounded-md border-0 bg-transparent p-0 text-body-medium outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring" onBlur={()=>{const next=cancel.current?widget.title:title.trim()||widget.title;cancel.current=false;setTitle(next);if(editable)onChange?.({title:next});}} onKeyDown={event=>{if(event.key==='Escape'){cancel.current=true;setTitle(widget.title);event.currentTarget.blur();}else if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/>
   </TextField>
  </header>
  <TextField aria-label={`Edit ${widget.title}`} value={draft} onChange={setDraft} isReadOnly={!editable}>
   <TextArea ref={area} aria-label={`Edit ${widget.title}`} rows={1} maxLength={10000} autoFocus={focusOnMount&&editable} placeholder={editable?'Write your text…':''} className="block min-h-12 w-full resize-none overflow-hidden rounded-md border-0 bg-transparent p-0 font-sans text-body-regular text-text-secondary outline-none placeholder:text-text-placeholder focus-visible:ring-2 focus-visible:ring-border-focus-ring" onBlur={()=>{if(editable){const content=cancel.current?widget.content:draft;cancel.current=false;onChange?.({content});}}} onKeyDown={event=>{if(event.key==='Escape'){cancel.current=true;setDraft(widget.content);event.currentTarget.blur();}else if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/>
  </TextField>
 </section>;
}
