'use client';

import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';

type Period={start:string;end:string};
type Value={period:Period|undefined;publish:(period:Period)=>void};
const Context=createContext<Value|null>(null);

/** Publish the actual snapshot range without delaying the page header. */
export function ChannelReportPeriodProvider({children}:{children:ReactNode}){
 const path=usePathname(),query=useSearchParams(),key=`${path}?${query.toString()}`;
 const [entry,setEntry]=useState<{key:string;period:Period}|null>(null);
 const value=useMemo(()=>({period:entry?.key===key?entry.period:undefined,publish:(period:Period)=>setEntry(previous=>previous?.key===key&&previous.period.start===period.start&&previous.period.end===period.end?previous:{key,period})}),[entry,key]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useChannelReportPeriod(){return useContext(Context)?.period;}
export function ChannelReportPeriodSync({period}:{period:Period}){
 const context=useContext(Context);
 useEffect(()=>{context?.publish(period);},[context,period]);
 return null;
}
