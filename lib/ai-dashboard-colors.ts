export const CHART_PALETTE=Array.from({length:8},(_,index)=>({label:['Teal','Lime','Pink','Sky','Purple','Blue','Emerald','Yellow'][index],value:`var(--color-chart-${index+1})`}));
export type ChartColors=Record<string,Record<string,string>>;
export function validChartColor(value:unknown):value is string{return typeof value==='string'&&(/^#[\da-f]{6}$/i.test(value)||CHART_PALETTE.some(color=>color.value===value));}
export function parseChartColors(value:unknown):ChartColors{
 if(!value||typeof value!=='object'||Array.isArray(value))return{};
 const result:ChartColors={};
 for(const [key,row]of Object.entries(value).slice(0,200)){
  if(!/^[\w-]{1,60}$/.test(key)||!row||typeof row!=='object'||Array.isArray(row))continue;
  const series:Record<string,string>={};
  for(const [metric,color]of Object.entries(row).slice(0,30))if(/^[\w]{1,50}$/.test(metric)&&validChartColor(color))series[metric]=color;
  Object.defineProperty(result,key,{value:series,enumerable:true,writable:true,configurable:true});
 }
 return result;
}
