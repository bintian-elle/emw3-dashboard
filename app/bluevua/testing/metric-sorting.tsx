"use client";
import {createContext,useContext,useState,useSyncExternalStore,type ReactNode} from "react";
import {RiArrowDownLine,RiArrowUpLine,RiExpandUpDownLine} from "@remixicon/react";
import {Button} from "@/components/base/buttons/button";
import {cx} from "@/utils/cx";
import {useSiteLanguage} from "@/components/application/dashboard/site-language-provider";
import {nextMetricSort,sortMetricRows,type MetricSort,type MetricSortValues} from "@/lib/testing-metric-sort";
const Context=createContext<{sort:MetricSort;toggle:(key:string)=>void;ready:boolean}|null>(null);
const subscribe=()=>()=>{};
export function useMetricSortReady(){return useSyncExternalStore(subscribe,()=>true,()=>false);}
export function MetricSortScope({children}:{children:ReactNode}){
 const [sort,setSort]=useState<MetricSort>(null),ready=useMetricSortReady();
 return <Context.Provider value={{sort,ready,toggle:key=>setSort(previous=>nextMetricSort(previous,key))}}>{children}</Context.Provider>;
}
export function MetricSortButton({metric,label,align="right",className}:{metric:string;label:string;align?:"left"|"right";className?:string}){
 const context=useContext(Context),{language}=useSiteLanguage(),active=context?.sort?.key===metric;
 const direction=active?context.sort!.direction:null,Icon=direction==='ascending'?RiArrowUpLine:direction==='descending'?RiArrowDownLine:RiExpandUpDownLine;
 const next=nextMetricSort(context?.sort??null,metric),action=next?(next.direction==='ascending'?(language==='zh'?'升序排列':'Sort ascending'):(language==='zh'?'降序排列':'Sort descending')):(language==='zh'?'恢复原始顺序':'Restore original order');
 return <Button type="button" variant="ghost" size="small" trailingIcon={Icon} aria-label={`${label}: ${action}`} aria-pressed={active} title={`${label}: ${action}`} disabled={!context?.ready} onClick={()=>context?.toggle(metric)} className={cx("h-auto min-h-8 max-w-full gap-1 whitespace-normal rounded-md bg-transparent p-0 text-caption-1-semibold text-text-tertiary shadow-none hover:bg-background-secondary-hover hover:text-text-primary",align==='right'?"ml-auto justify-end text-right":"justify-start text-left",active&&"text-text-primary",className)}>{label}</Button>;
}
export function MetricSortHeader({metric,label,className,buttonClassName}:{metric:string;label:string;className?:string;buttonClassName?:string}){
 const context=useContext(Context);
 return <th scope="col" aria-sort={context?.sort?.key===metric?context.sort.direction:'none'} className={className}><MetricSortButton metric={metric} label={label} className={buttonClassName}/></th>;
}
export function MetricSortedRows({rows,as="div"}:{rows:Array<{id:string;values:MetricSortValues;content:ReactNode}>;as?:"div"|"tbody"|"fragment"}){
 const context=useContext(Context),content=sortMetricRows(rows,context?.sort??null,row=>row.values).map(row=><RowContent key={row.id}>{row.content}</RowContent>);
 return as==='tbody'?<tbody>{content}</tbody>:as==='fragment'?<>{content}</>:<div>{content}</div>;
}
function RowContent({children}:{children:ReactNode}){return children;}
