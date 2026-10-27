'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {TextArea} from 'react-aria-components';
import {TextField} from '@/components/base/input/input';
import {cx} from '@/utils/cx';
export function EditableTitle({title,editable,onChange,compact=false}:{title:string;editable:boolean;onChange?:(title:string)=>void;compact?:boolean}){
 const [draft,setDraft]=useState(title),area=useRef<HTMLTextAreaElement>(null),cancel=useRef(false);
 useLayoutEffect(()=>{const element=area.current;if(element){element.style.height='0px';element.style.height=Math.max(20,element.scrollHeight)+'px';}},[draft]);
 return <TextField aria-label={`Edit title: ${title}`} value={draft} onChange={setDraft} isReadOnly={!editable} className="min-w-0 flex-1"><TextArea ref={area} aria-label={`Edit title: ${title}`} rows={1} maxLength={150} className={cx('block w-full resize-none overflow-hidden rounded-md border-0 bg-transparent p-0 text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring',compact?'text-caption-1-semibold':'text-body-medium')} onBlur={()=>{const next=cancel.current?title:draft.trim()||title;cancel.current=false;setDraft(next);if(editable&&next!==title)onChange?.(next);}} onKeyDown={event=>{if(event.key==='Escape'){cancel.current=true;setDraft(title);event.currentTarget.blur();}else if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/></TextField>;
}
