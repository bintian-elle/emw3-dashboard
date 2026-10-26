'use client';
import { RiCursorLine, RiEyeLine, RiGroupLine, RiShoppingCartLine } from '@remixicon/react';
import { StatCards } from '@/components/application/dashboard/stat-cards';
export function TrackingStats({values,kind="features"}:{values:string[];kind?:"features"|"overall"}){
 if(kind==="overall")return <StatCards stats={[
 {icon:RiGroupLine,label:"Unique Users",value:values[0],delta:"Deduplicated",deltaColor:"neutral"},
 {icon:RiCursorLine,label:"Events",value:values[1],delta:"All site events",deltaColor:"neutral"},
 {icon:RiShoppingCartLine,label:"Add to Cart",value:values[2],delta:"Events",deltaColor:"neutral"},
 {icon:RiShoppingCartLine,label:"Purchases",value:values[3],delta:"Events",deltaColor:"neutral"}]}/>;
 return <StatCards stats={[
 {icon:RiEyeLine,label:'Compare entry views',value:values[0],delta:'Events',deltaColor:'neutral'},
 {icon:RiCursorLine,label:'Compare clicks',value:values[1],delta:'Events',deltaColor:'neutral'},
 {icon:RiGroupLine,label:'Compare visitors',value:values[2],delta:'Users',deltaColor:'neutral'},
 {icon:RiShoppingCartLine,label:'Feature results',value:values[3],delta:'All outcomes',deltaColor:'neutral'}]}/>;
}
