'use client';

import {useEffect,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {Popover} from 'radix-ui';
import {CalendarDate,getDayOfWeek,parseDate} from '@internationalized/date';
import {Check,ChevronDown,ChevronLeft,ChevronRight,History} from 'lucide-react';
import {previewReportForPath} from '@/lib/testing-prompt-preview';
import type {HistoryReport} from '@/lib/testing-history-match';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import {testingLatestCompleteDate} from '@/lib/testing-period';
import {useTestingStaging} from './testing-staging-context';
import {NovaButton} from './nova-preview-ui';
import styles from './nova-history-menu.module.css';

type Frequency='daily'|'weekly'|'monthly';
type Selection={type:Frequency;start:string;end:string};
const labels:Record<Frequency,string>={daily:'Daily Insight',weekly:'Weekly Insight',monthly:'Monthly Insight'};

export function NovaHistoryMenu({pageTitle}:{pageTitle?:string}){
 const enabled=useTestingStaging(),{language}=useSiteLanguage(),zh=language==='zh',pathname=usePathname(),router=useRouter(),params=useSearchParams();
 const [frequency,setFrequency]=useState<Frequency>('daily');
 const [month,setMonth]=useState(()=>{const date=parseDate(testingLatestCompleteDate());return new CalendarDate(date.year,date.month,1);});
 const [selection,setSelection]=useState<Selection|null>(null);
 const [open,setOpen]=useState(false),[attempt,setAttempt]=useState(0);
 const [lookup,setLookup]=useState<{key:string;state:'loading'|'error'|'done';report?:HistoryReport|null;untranslated?:boolean}>({key:'',state:'loading'});
 const base=previewReportForPath(pathname),prefix=pathname.match(/^\/bluevua\/testing\/(google\/(?:search|pmax|demand-gen)|meta|reddit|edm)(?:\/|$)/)?.[1];
 const candidateScope=base??(prefix?previewReportForPath(`/bluevua/testing/${prefix}`):null);
 const scope=candidateScope&&candidateScope!=='social-media'?candidateScope:null,campaign=base?undefined:scope?pageTitle:undefined;
 const active=selection?.type===frequency?selection:null;
 const lookupKey=active&&scope?`${active.type}:${active.start}:${active.end}:${scope}:${campaign??''}:${language}:${attempt}`:'';
 useEffect(()=>{
  if(!enabled||!open||!active||!scope)return;
  const controller=new AbortController(),params=new URLSearchParams({frequency:active.type,start:active.start,end:active.end,scope,language,...(campaign?{campaign}:{})});
  fetch(`/api/testing/history?${params}`,{cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw Error('lookup');return response.json() as Promise<{report:HistoryReport|null;untranslated:boolean}>;}).then(data=>setLookup({key:lookupKey,state:'done',...data})).catch(()=>{if(!controller.signal.aborted)setLookup({key:lookupKey,state:'error'});});
  return()=>controller.abort();
 },[enabled,open,active,scope,campaign,language,lookupKey]);
 if(!enabled)return null;
 const latest=testingLatestCompleteDate();
 const offset=(getDayOfWeek(month,'en-US')+5)%7;
 const first=month.subtract({days:offset});
 const rowCount=Math.ceil((offset+month.calendar.getDaysInMonth(month))/7);
 const weeks=Array.from({length:rowCount},(_,row)=>Array.from({length:7},(_,day)=>first.add({days:row*7+day})));
 const monthLabel=new Intl.DateTimeFormat(zh?'zh-CN':'en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(month.toDate('UTC'));
 const weekdays=zh?['二','三','四','五','六','日','一']:['Tu','We','Th','Fr','Sa','Su','Mo'];
 const choose=(type:Frequency,start:CalendarDate,end=start)=>{setLookup({key:'',state:'loading'});setSelection({type,start:start.toString(),end:end.toString()});};
 const result=lookup.key===lookupKey?lookup:null;
 return <Popover.Root open={open} onOpenChange={value=>{if(value)setLookup({key:'',state:'loading'});setOpen(value);}}>
  <Popover.Trigger asChild><NovaButton data-review-target="testing-report-history" type="button" variant="outline"><History aria-hidden="true"/>{zh?'查看历史报告':'View history'}<ChevronDown aria-hidden="true"/></NovaButton></Popover.Trigger>
  <Popover.Portal><Popover.Content className={styles.content} align="end" sideOffset={6} collisionPadding={12} aria-label={zh?'选择历史报告日期':'Choose a historical report date'}>
   <div>
    <div role="group" className={styles.tabs} aria-label={zh?'报告类型':'Report type'}>{(Object.keys(labels) as Frequency[]).map(value=><button key={value} type="button" aria-pressed={frequency===value} onClick={()=>setFrequency(value)} className={styles.tab}>{labels[value].replace(' Insight','')}</button>)}</div>
    <div className={styles.calendar}>
     <div className={styles.monthHeader}>
      <button type="button" className={styles.nav} aria-label={frequency==='monthly'?(zh?'上一年':'Previous year'):(zh?'上个月':'Previous month')} onClick={()=>setMonth(frequency==='monthly'?month.subtract({years:1}):month.subtract({months:1}))}><ChevronLeft aria-hidden="true"/></button>
      <strong>{frequency==='monthly'?(zh?`${month.year}年`:month.year):monthLabel}</strong>
      <button type="button" className={styles.nav} aria-label={frequency==='monthly'?(zh?'下一年':'Next year'):(zh?'下个月':'Next month')} disabled={frequency==='monthly'?month.year>=parseDate(latest).year:month.add({months:1}).toString()>latest} onClick={()=>setMonth(frequency==='monthly'?month.add({years:1}):month.add({months:1}))}><ChevronRight aria-hidden="true"/></button>
     </div>
     {frequency==='monthly'?<div className={styles.monthGrid} role="group" aria-label={zh?'选择月份':'Select month'}>{Array.from({length:12},(_,index)=>{
      const start=new CalendarDate(month.year,index+1,1),end=start.add({months:1}).subtract({days:1}),selected=active?.start===start.toString()&&active?.end===end.toString();
      const text=zh?`${index+1}月`:new Intl.DateTimeFormat('en-US',{month:'short',timeZone:'UTC'}).format(start.toDate('UTC'));
      return <button key={index} type="button" className={styles.monthOption} aria-label={zh?`${month.year}年${text}`:`${text} ${month.year}`} aria-pressed={selected} disabled={end.toString()>latest} onClick={()=>{setMonth(start);choose('monthly',start,end);}}>{text}</button>;
     })}</div>:<table className={styles.grid} aria-label={monthLabel}><thead><tr>{frequency==='weekly'&&<th scope="col"><span className={styles.srOnly}>{zh?'选择周':'Select week'}</span></th>}{weekdays.map((day,index)=><th scope="col" key={index}>{day}</th>)}</tr></thead><tbody>{weeks.map((week,index)=>{const start=week[0],end=week[6],selected=active?.start===start.toString()&&active?.end===end.toString(),unavailable=end.toString()>latest;return <tr key={index}>
      {frequency==='weekly'&&<td><button type="button" className={styles.weekButton} aria-label={`${zh?'选择':'Select'} ${start.toString()} – ${end.toString()}`} aria-pressed={selected} disabled={unavailable} onClick={()=>choose('weekly',start,end)}>{selected&&<Check aria-hidden="true"/>}</button></td>}
      {week.map(day=>{const value=day.toString(),isActive=frequency==='daily'&&active?.start===value;return <td key={value}>{frequency==='daily'?<button type="button" className={styles.day} data-outside={day.month!==month.month} aria-label={value} aria-pressed={isActive} disabled={value>latest} onClick={()=>choose('daily',day)}>{day.day}</button>:<span className={styles.dayLabel} data-outside={day.month!==month.month}>{day.day}</span>}</td>;})}
     </tr>;})}</tbody></table>}
     {frequency==='weekly'&&<p className={styles.hint}>{zh?'周二至周一':'Tuesday to Monday'}</p>}
     <div className={styles.status} role="status">{active?<><strong>{active.start}{active.start!==active.end?` – ${active.end}`:''}</strong>{!scope?<span>{zh?'此页面暂无历史报告':'History is unavailable for this page.'}</span>:!result?<span>{zh?'正在查询报告…':'Checking for a report…'}</span>:result.state==='error'?<span>{zh?'查询失败，请重试。':'Could not check reports.'} <button type="button" className={styles.textButton} onClick={()=>setAttempt(value=>value+1)}>{zh?'重试':'Retry'}</button></span>:result.report?<><button type="button" className={styles.viewReport} onClick={()=>{const next=new URLSearchParams(params.toString());next.set('period','custom');next.set('start',active.start);next.set('end',active.end);next.set('history',active.type);next.delete('compare');next.delete('compareStart');next.delete('compareEnd');setOpen(false);router.push(`${pathname}?${next}`,{scroll:false});}}>{zh?'查看报告':'View report'}</button>{result.untranslated&&<span>{zh?'中文版本暂不可用，显示原文':'Chinese translation unavailable; showing original.'}</span>}</>:<span>{zh?'暂无报告':'No report available'}</span>}</>:<span>{zh?'请选择日期':'Select a date'}</span>}</div>
    </div>
   </div>
  </Popover.Content></Popover.Portal>
 </Popover.Root>;
}
