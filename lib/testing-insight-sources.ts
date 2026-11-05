/** Includes exact registered links embedded in original ad copy, Markdown and email HTML. */
export function insightSourceUrls(value:unknown,out=new Set<string>()):Set<string>{
 if(typeof value==='string'){
  // Preserve registered, same-site testing links as well as external sources.
  if(/^\/bluevua\/testing\/[a-zA-Z0-9_/-]+$/.test(value)&&!value.includes('//'))out.add(value);
  const candidates=[value,...(value.match(/https:\/\/[^\s<>"'\)\]]+/g)??[])];
  for(const text of candidates){if(!text.startsWith('https://'))continue;try{const url=new URL(text);if(url.protocol==='https:'&&!/\s/.test(text))out.add(url.href);}catch{}}
 }else if(Array.isArray(value))for(const item of value)insightSourceUrls(item,out);
 else if(value&&typeof value==='object')for(const item of Object.values(value))insightSourceUrls(item,out);
 return out;
}
