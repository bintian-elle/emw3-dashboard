'use client';

import {Select} from 'radix-ui';
import {useState} from 'react';
import {Check,ChevronDown} from 'lucide-react';
import {parseDate} from '@internationalized/date';
import {DateRangePicker,type DateRangeValue} from '@/components/base/date-picker/date-range-picker';
import {testingLatestCompleteDate} from '@/lib/testing-period';
import {useSiteLanguage} from '@/components/application/dashboard/site-language-provider';
import styles from './nova-preview-shell.module.css';

export const novaReportingPeriods=[['lastWeek','Last Week (Tue–Mon)'],['wtd','Week-to-date'],['mtd','Month-to-date'],['ytd','Year-to-date'],['last7','Last 7 days'],['last30','Last 30 days'],['last90','Last 90 days'],['custom','Custom']] as const;
export type NovaPeriodOption=readonly [string,string];
export function validateLatestCompleteRange(range:DateRangeValue,zh=false){
 return range.end.toString()>testingLatestCompleteDate()?(zh?'请选择最新完整日期及之前的时间。':'Choose dates through the latest complete day.'):undefined;
}

/** Keep an unsubmitted custom range local, but reset it if navigation changes the URL. */
export function useNovaPeriodDraft(period:string|null,startParam:string|null,endParam:string|null){
 const key=JSON.stringify([period,startParam,endParam]);
 const initial={key,start:startParam??'',end:endParam??'',custom:false};
 const [state,setState]=useState(initial);
 if(state.key!==key)setState(initial);
 const current=state.key===key?state:initial;
 return {start:current.start,end:current.end,customDraft:current.custom,setStart:(start:string)=>setState(previous=>({...previous,start})),setEnd:(end:string)=>setState(previous=>({...previous,end})),setCustomDraft:(custom:boolean)=>setState(previous=>({...previous,custom}))};
}

export function NovaReportingPeriodSelect({value,onValueChange,disabled,id,ariaLabel,options=novaReportingPeriods}:{value:string;onValueChange:(value:string)=>void;disabled?:boolean;id?:string;ariaLabel:string;options?:readonly NovaPeriodOption[]}){
 const {language}=useSiteLanguage();
 const zhLabels:Record<string,string>={lastWeek:'上周（周二至周一）',wtd:'本周至今',mtd:'本月至今',ytd:'今年至今',last7:'最近 7 天',last30:'最近 30 天',last90:'最近 90 天',custom:'自定义',sinceSep24:'全周期（2026 年 9 月 24 日至今）'};
 const display=(key:string,label:string)=>language==='zh'?(zhLabels[key]??label):label;
 const selected=options.find(([option])=>option===value)??options.find(([option])=>option==='lastWeek')??options[0];
 return <Select.Root value={selected?.[0]} onValueChange={onValueChange} disabled={disabled}><Select.Trigger id={id} className={styles.selectTrigger} aria-label={ariaLabel}><Select.Value>{selected&&display(selected[0],selected[1])}</Select.Value><Select.Icon><ChevronDown/></Select.Icon></Select.Trigger><Select.Portal><Select.Content position="popper" className={styles.selectContent}><Select.Viewport>{options.map(([option,label])=><Select.Item key={option} value={option} className={styles.selectItem}><Select.ItemText>{display(option,label)}</Select.ItemText><Select.ItemIndicator><Check/></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal></Select.Root>;
}

export function NovaReportingPeriodCustom({start,end,onApply,zh=false,disabled,validateRange}:{start:string;end:string;onApply:(range:DateRangeValue)=>void;zh?:boolean;disabled?:boolean;validateRange?:(range:DateRangeValue)=>string|undefined}){
 let value:DateRangeValue|null=null;
 try{if(start&&end)value={start:parseDate(start),end:parseDate(end)};}catch{/* An incomplete URL range has no committed selection. */}
 return <div className={styles.custom}><span>{zh?'自定义时间':'Custom range'}</span><DateRangePicker value={value} aria-label={zh?'自定义报告周期':'Custom reporting period'} isDisabled={disabled} validateRange={range=>validateLatestCompleteRange(range,zh)??validateRange?.(range)} onChange={range=>{if(range)onApply(range);}}/></div>;
}
