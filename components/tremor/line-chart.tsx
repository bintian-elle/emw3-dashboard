"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Series={name:string;values:number[];color:string};
export function TremorLineChart({dates,series}:{dates:string[];series:Series[]}){
 const [hidden,setHidden]=useState<Set<string>>(()=>new Set());
 const rows=dates.map((date,index)=>Object.fromEntries([["date",date],...series.map(item=>[item.name,item.values[index]||0])]));
 const percentage=series.length>0&&series.every(item=>/unsubscribe|spam|bounce/i.test(item.name));
 const formatValue=(value:number)=>percentage?`${(value*100).toFixed(value?1:0)}%`:new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(value);
 const toggle=(name:string)=>setHidden(current=>{const next=new Set(current);if(next.has(name))next.delete(name);else next.add(name);return next});
 return <div className="w-full" role="img" aria-label="Daily trend"><div className="mb-3 flex flex-wrap justify-end gap-x-4 gap-y-2">{series.map(item=><button key={item.name} type="button" aria-pressed={!hidden.has(item.name)} onClick={()=>toggle(item.name)} className="flex items-center gap-2 text-body-2-regular text-text-secondary outline-none transition-opacity hover:text-text-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring" style={{opacity:hidden.has(item.name)?0.38:1}}><span className="size-2.5 rounded-full" style={{backgroundColor:item.color}}/>{item.name}</button>)}</div><div className="h-72 w-full sm:h-80"><ResponsiveContainer width="100%" height="100%"><LineChart data={rows} margin={{top:8,right:12,left:4,bottom:0}}><CartesianGrid vertical={false} stroke="var(--color-separator-border)"/><XAxis dataKey="date" tickLine={false} axisLine={false} minTickGap={28} tick={{fill:"var(--color-text-tertiary)",fontSize:12}}/><YAxis tickLine={false} axisLine={false} width={52} tickFormatter={formatValue} tick={{fill:"var(--color-text-tertiary)",fontSize:12}}/><Tooltip formatter={value=>formatValue(Number(value))} contentStyle={{background:"var(--color-background-primary-default)",border:"1px solid var(--color-border-button-default)",borderRadius:"10px",boxShadow:"var(--shadow-sm)"}} labelStyle={{color:"var(--color-text-secondary)"}}/>{series.map(item=><Line key={item.name} type="linear" dataKey={item.name} hide={hidden.has(item.name)} stroke={item.color} strokeWidth={2.5} dot={{r:3,fill:item.color,strokeWidth:0}} activeDot={{r:5}} connectNulls/>)}</LineChart></ResponsiveContainer></div></div>
}
