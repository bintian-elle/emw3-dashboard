/** Display metadata only. Metrics and attribution never come from this catalogue. */
export type InsightAsset={id:string;channel:string;name:string;kind:string;image?:string;url?:string;description?:string;aliases?:string[]};
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const string=(value:unknown)=>typeof value==='string'?value:undefined;
export function safeInsightUrl(value:unknown){if(typeof value!=='string')return undefined;try{const url=new URL(value);return /^https?:$/.test(url.protocol)?url.href:undefined;}catch{return undefined;}}
export function buildInsightAssets(channel:string,payload:unknown):InsightAsset[]{
 const found=new Map<string,InsightAsset>();
 function walk(value:unknown){
  if(Array.isArray(value)){value.forEach(walk);return;}
  if(!record(value))return;
  const asset=record(value.asset)?value.asset:null;
  if(asset){
   const id=string(asset.id),text=record(asset.textAsset)?string(asset.textAsset.text):undefined,video=record(asset.youtubeVideoAsset)?asset.youtubeVideoAsset:null;
   const videoId=video?string(video.youtubeVideoId):undefined;
   const image=record(asset.imageAsset)&&record(asset.imageAsset.fullSize)?safeInsightUrl(asset.imageAsset.fullSize.url):undefined;
   const name=text||string(asset.name)||(video?string(video.youtubeVideoTitle):undefined);
   if(id){const url=videoId?`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`:image||(channel==='google-pmax'&&record(value.assetGroup)&&string(value.assetGroup.id)?`/bluevua/testing/google/pmax/${encodeURIComponent(String(value.assetGroup.id))}`:undefined);found.set(id,{id,channel,name:name||`Unnamed ${String(asset.type||'asset').toLowerCase()}`,kind:String(asset.type||'Asset'),image:image||(videoId?`/api/google/creative-media/youtube/${encodeURIComponent(videoId)}`:undefined),url,description:text});}
  }
  for(const key of ['campaign','assetGroup','adGroup']){
   const entity=value[key];if(!record(entity)||!string(entity.id)||!string(entity.name))continue;
   const id=String(entity.id),base=channel==='google-pmax'?'google/pmax':channel==='google-demand-gen'?'google/demand-gen':channel==='google-search'?'google/search':channel;
   found.set(id,{id,channel,name:String(entity.name),kind:key,url:`/bluevua/testing/${base}${key==='assetGroup'?`/${encodeURIComponent(id)}`:''}`});
  }
  for(const [idKey,nameKey,kind] of [['campaignId','campaignName','Campaign'],['adGroupId','name','Ad group']] as const){
   if(string(value[idKey])&&string(value[nameKey]))found.set(String(value[idKey]),{id:String(value[idKey]),channel,name:String(value[nameKey]),kind,url:`/bluevua/testing/${channel.startsWith('reddit')?'reddit':channel}`});
  }
  const ad=record(value.adGroupAd)&&record(value.adGroupAd.ad)?value.adGroupAd.ad:null;
  if(ad&&string(ad.id)){
   const rsa=record(ad.responsiveSearchAd)?ad.responsiveSearchAd:null;
   const headline=rsa&&Array.isArray(rsa.headlines)?rsa.headlines.find(item=>record(item)&&string(item.text)):null;
   const name=string(ad.name)||(record(headline)?string(headline.text):undefined);
   if(name)found.set(String(ad.id),{id:String(ad.id),channel,name,kind:'Ad',description:record(headline)?string(headline.text):undefined,url:Array.isArray(ad.finalUrls)?safeInsightUrl(ad.finalUrls[0]):undefined});
  }
  const adId=string(value.adId);
  if(adId&&string(value.name))found.set(adId,{id:adId,channel,name:String(value.name),kind:String(value.mediaType||value.contentType||'Ad'),image:safeInsightUrl(value.thumbnailUrl),url:safeInsightUrl(value.postUrl)||safeInsightUrl(value.previewUrl)||safeInsightUrl(value.videoUrl),description:string(value.headline)||string(value.body)});
  if(channel==='social'&&Array.isArray(value.posts))value.posts.forEach((post,index)=>{if(!record(post)||!string(post.code))return;const name=`Post ${index+1}`;found.set(String(post.code),{id:String(post.code),channel,name,aliases:[`Post #${index+1}`],kind:String(post.mediaType||'Post'),image:safeInsightUrl(post.thumbnailUrl),url:safeInsightUrl(post.url),description:string(post.caption)});});
  // Demand Gen's asset list contains plain asset objects, not {asset} wrappers.
  if(Array.isArray(value.adAssets))value.adAssets.forEach(item=>walk({asset:item}));
  Object.entries(value).filter(([key])=>!['adAssets','days','daily','history','performance','pmaxAssetDays','pmaxProductDays','metrics','totals'].includes(key)).forEach(([,child])=>{if(child&&typeof child==='object')walk(child);});
 }
 walk(payload);return [...found.values()];
}
export type InsightAssetPart=string|InsightAsset;
function unresolvedAssetText(text:string):InsightAssetPart[]{
 const parts:InsightAssetPart[]=[];let start=0;
 const expression=/(?:\b(?:Asset|Ad|Creative)[ _-]*ID\s*[:：#]?\s*|素材(?:ID|编号)\s*[:：#]?\s*)(\d{8,})/gi;
 for(const match of text.matchAll(expression)){if(match.index!>start)parts.push(text.slice(start,match.index));parts.push({id:match[1],channel:'unknown',name:'Creative · details pending',kind:'Asset'});start=match.index!+match[0].length;}
 if(start<text.length)parts.push(text.slice(start));return parts.length?parts:[text];
}
export function splitInsightAssetText(text:string,assets:readonly InsightAsset[]):InsightAssetPart[]{
 if(/^\d{10,}$/.test(text)&&!assets.some(asset=>asset.id===text))return [{id:text,channel:'unknown',name:'Creative · details pending',kind:'Asset'}];
 const aliases=new Map<string,InsightAsset|null>();
 for(const asset of assets)for(const alias of [asset.id,asset.name,...asset.aliases??[]]){
  if(alias.length<4)continue;
  const previous=aliases.get(alias);aliases.set(alias,previous===undefined?asset:previous?.id===asset.id&&previous.channel===asset.channel?asset:null);
 }
 const tokens=[...aliases].filter(([,asset])=>asset).map(([alias])=>alias).sort((a,b)=>b.length-a.length);
 if(!tokens.length)return /^\d{10,}$/.test(text)?[{id:text,channel:'unknown',name:'Creative · details pending',kind:'Asset'}]:unresolvedAssetText(text);
 const pattern=new RegExp(tokens.map(token=>token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
 const parts:InsightAssetPart[]=[];let start=0;
 for(const match of text.matchAll(pattern)){
  const token=match[0],index=match.index!;
  if(/^\d+$/.test(token)&&(/\d/.test(text[index-1]||'')||/\d/.test(text[index+token.length]||'')))continue;
  if(/^Post #?\d+$/.test(token)&&/\d/.test(text[index+token.length]||''))continue;
  if(!/^\d+$/.test(token)&&((/[a-z0-9]/i.test(token[0])&&/[a-z0-9]/i.test(text[index-1]||''))||(/[a-z0-9]/i.test(token.at(-1)!)&&/[a-z0-9]/i.test(text[index+token.length]||''))))continue;
  if(index>start)parts.push(...unresolvedAssetText(text.slice(start,index)));parts.push(aliases.get(token)!);start=index+token.length;
 }
 if(start<text.length)parts.push(...unresolvedAssetText(text.slice(start)));return parts.length?parts:[text];
}
