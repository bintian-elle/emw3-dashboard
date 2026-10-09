export type PreviewTextAsset={text?:string;pinnedField?:string};
export function previewTextCombination(assets:PreviewTextAsset[],prefix:"HEADLINE"|"DESCRIPTION",slots:number,variant:number){
 const available=assets.filter(asset=>asset.text?.trim());
 const unpinned=available.filter(asset=>!asset.pinnedField||asset.pinnedField==="UNSPECIFIED"||asset.pinnedField==="UNKNOWN");
 const used=new Set<string>();let cursor=variant;
 const result:string[]=[];
 for(let slot=1;slot<=slots;slot++){
  const pinned=available.filter(asset=>asset.pinnedField===`${prefix}_${slot}`);
  let selected=pinned.length?pinned[variant%pinned.length]:undefined;
  if(!selected&&unpinned.length){for(let attempt=0;attempt<unpinned.length;attempt++){const candidate=unpinned[cursor++%unpinned.length];if(!used.has(candidate.text!)){selected=candidate;break;}}}
  if(selected?.text){result.push(selected.text);used.add(selected.text);}
 }
 return result;
}
export function previewDestination(raw:string|undefined,path1?:string,path2?:string){
 if(!raw)return {href:null,display:"Landing page not available",domain:""};
 try{const url=new URL(raw);if(!["http:","https:"].includes(url.protocol))throw Error("Invalid protocol");const paths=[path1,path2].filter(Boolean).join("/");return {href:url.href,display:`${url.hostname}${paths?`/${paths}`:url.pathname==="/"?"":url.pathname}`,domain:url.hostname};}
 catch{return {href:null,display:"Landing page not available",domain:""};}
}
