'use client';
import {Badge} from '@/components/ui/badge';
export function ComparisonBadge({value,label,metric}:{value:unknown;label:string;metric:string}){
 const delta=typeof value==='number'&&Number.isFinite(value)?value:null;
 const inverse=['cpc','cpa'].includes(metric.replace(/_(pop|yoy)$/,''));
 const good=delta!==null&&(inverse?delta<=0:delta>=0);
 return <Badge variant={delta===null?'secondary':good?'success':'danger'}>{delta===null?`--% ${label}`:`${delta>=0?'↑':'↓'} ${Math.abs(delta).toFixed(1)}% ${label}`}</Badge>;
}
