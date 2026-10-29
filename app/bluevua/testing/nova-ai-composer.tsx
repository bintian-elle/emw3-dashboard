'use client';

import type { ClipboardEventHandler, CSSProperties, FormEvent, Ref } from 'react';
import { ArrowUp, Paperclip, Square } from 'lucide-react';
import { NovaButton } from './nova-preview-ui';
import styles from './nova-ai-composer.module.css';

type Props = {
 value:string;
 onChange:(value:string)=>void;
 onSubmit:(event:FormEvent<HTMLFormElement>)=>void;
 placeholder:string;
 inputLabel:string;
 formLabel?:string;
 inputRef?:Ref<HTMLTextAreaElement>;
 formRef?:Ref<HTMLFormElement>;
 onPaste?:ClipboardEventHandler<HTMLTextAreaElement>;
 style?:CSSProperties;
 className?:string;
 maxLength?:number;
 disabled?:boolean;
 sendDisabled?:boolean;
 sendLabel?:string;
 onAttach?:()=>void;
 attachDisabled?:boolean;
 attachLabel?:string;
 stopAction?:()=>void;
 stopDisabled?:boolean;
 stopLabel?:string;
};

/** One source-owned composer shared by insights and the Ask AI panel. */
export function NovaAiComposer({value,onChange,onSubmit,placeholder,inputLabel,formLabel,inputRef,formRef,onPaste,style,className,maxLength=2000,disabled=false,sendDisabled=false,sendLabel='Send',onAttach,attachDisabled=false,attachLabel='Add attachments',stopAction,stopDisabled=false,stopLabel='Stop'}:Props){
 return <form ref={formRef} className={[styles.composer,className].filter(Boolean).join(' ')} style={style} aria-label={formLabel} onSubmit={onSubmit}>
  {onAttach&&<NovaButton type="button" variant="ghost" size="icon" className={styles.attach} aria-label={attachLabel} title={attachLabel} disabled={attachDisabled} onClick={onAttach}><Paperclip aria-hidden="true"/></NovaButton>}
  <textarea ref={inputRef} data-slot="textarea" className={styles.textarea} aria-label={inputLabel} placeholder={placeholder} value={value} onChange={event=>onChange(event.currentTarget.value)} onPaste={onPaste} maxLength={maxLength} disabled={disabled} rows={1} onKeyDown={event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();if(!sendDisabled&&!stopAction)event.currentTarget.form?.requestSubmit();}}}/>
  {stopAction?<NovaButton type="button" variant="outline" size="icon" className={styles.send} aria-label={stopLabel} disabled={stopDisabled} onClick={stopAction}><Square aria-hidden="true"/></NovaButton>:<NovaButton type="submit" size="icon" className={styles.send} aria-label={sendLabel} disabled={sendDisabled}><ArrowUp aria-hidden="true"/></NovaButton>}
 </form>;
}
