type CatalogueEntry={channel:string;id:string;name:string};
type Dict=ReadonlyMap<string,string>;
const isRecord=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const key=(channel:string,id:string)=>`${channel}:${id}`;
export function creativeNamesIndex(entries:readonly CatalogueEntry[]):Dict{return new Map(entries.map(item=>[key(item.channel,item.id),item.name]));}
/** Externalize an ad or creative name only when the saved local identity matches exactly. */
export function externalizeCreativeNames<T>(channel:string,value:T,index:Dict):T{
 const visit=(input:unknown):unknown=>{
  if(Array.isArray(input))return input.map(visit);
  if(!isRecord(input)||!(Object.getPrototypeOf(input)===Object.prototype||Object.getPrototypeOf(input)===null))return input;
  const output=Object.fromEntries(Object.entries(input).map(([name,item])=>[name,visit(item)]));
  const id=typeof output.adId==='string'?output.adId:typeof output.id==='string'&&('imageAsset'in output||'textAsset'in output||'youtubeVideoAsset'in output||'responsiveSearchAd'in output)?output.id:null;
  if(id&&typeof output.name==='string'&&output.name===index.get(key(channel,id))){delete output.name;output.__localCreativeName=id;}
  return output;
 };
 return visit(value) as T;
}
/** Restore only explicitly externalized names; unknown or changed creatives remain untouched. */
export function restoreCreativeNames<T>(channel:string,value:T,index:Dict):T{
 const visit=(input:unknown):unknown=>{
  if(Array.isArray(input))return input.map(visit);
  if(!isRecord(input)||!(Object.getPrototypeOf(input)===Object.prototype||Object.getPrototypeOf(input)===null))return input;
  const output=Object.fromEntries(Object.entries(input).map(([name,item])=>[name,visit(item)]));
  if(typeof output.__localCreativeName==='string'){
   const name=index.get(key(channel,output.__localCreativeName));if(!name)throw Error(`Local creative name is missing for ${channel}`);
   if(!('name'in output))output.name=name;delete output.__localCreativeName;
  }
  return output;
 };
 return visit(value) as T;
}
