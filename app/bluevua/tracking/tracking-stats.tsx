'use client';
import { ReportStats } from './report-stats';
export function TrackingStats({values,kind="features"}:{values:string[];kind?:"features"|"overall"}){
 if(kind==="overall")return <ReportStats stats={[
 {label:"Unique Users",value:values[0],delta:"Deduplicated"},
 {label:"Events",value:values[1],delta:"All site events"},
 {label:"Add to Cart",value:values[2],delta:"Events"},
 {label:"Purchases",value:values[3],delta:"Events"}]}/>;
 return <ReportStats stats={[
 {label:'Compare entry views',value:values[0],delta:'Events'},
 {label:'Compare clicks',value:values[1],delta:'Events'},
 {label:'Compare visitors',value:values[2],delta:'Users'},
 {label:'Feature results',value:values[3],delta:'All outcomes'}]}/>;
}
