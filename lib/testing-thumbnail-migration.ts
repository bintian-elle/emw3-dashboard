/** Replace cached thumbnail source URLs with local paths, retaining all other fields. */
export function localizeSnapshotThumbnails<T>(value:T,lookup:(source:string)=>string|null):T{
 const visit=(input:unknown,key=''):unknown=>{
  if(typeof input==='string'&&['thumbnailUrl','thumbnail_url','preview_thumbnail_url'].includes(key)){
   const local=lookup(input);return local?.startsWith('/testing/thumbnails/')?local:input;
  }
  if(Array.isArray(input))return input.map(item=>visit(item,key));
  if(input&&typeof input==='object'&&(Object.getPrototypeOf(input)===Object.prototype||Object.getPrototypeOf(input)===null))return Object.fromEntries(Object.entries(input).map(([name,item])=>[name,visit(item,name)]));
  return input;
 };
 return visit(value) as T;
}
