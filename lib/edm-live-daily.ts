type AggregateRow={dimensions:string[];measurements:Record<string,number[]>};
export type DailyAggregate={data:{attributes:{dates?:string[];data:AggregateRow[]}}};
export function dailyRows(pages:DailyAggregate[],measurementNames:string[]){
 return pages.flatMap(page=>{
  const attrs=page.data.attributes;if(!Array.isArray(attrs.dates))throw Error('Missing Klaviyo daily dates');
  return attrs.data.flatMap(row=>{
   // Klaviyo can return one empty grouped row with a single zero even when
   // its dates array spans several days. It represents no events, not a
   // truncated series with values that can safely be inferred.
   const placeholder=Array.isArray(row.dimensions)&&row.dimensions.every(value=>value==='')&&measurementNames.length>0&&measurementNames.every(name=>Array.isArray(row.measurements[name])&&row.measurements[name].length===1&&row.measurements[name][0]===0);
   if(placeholder)return [];
   return attrs.dates!.map((date,index)=>({date:date.slice(0,10),dimensions:row.dimensions,measurements:Object.fromEntries(measurementNames.map(name=>{const value=row.measurements[name]?.[index];if(typeof value!=='number'||!Number.isFinite(value)||value<0)throw Error('Invalid Klaviyo daily measurement');return [name,value];}))}));
  });
 });
}
