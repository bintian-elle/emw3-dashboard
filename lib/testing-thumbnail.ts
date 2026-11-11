import manifest from './testing-thumbnail-manifest.json';
import youtubeThumbnails from './testing-youtube-thumbnails.json';
import googleAssets from './testing-google-asset-thumbnails.json';
const thumbnails:Record<string,string>=manifest;
/** Known campaign thumbnails are served from local files, independently of temporary CDN signatures. */
export function localTestingThumbnail(source:string|null|undefined){
 if(!source)return source??null;
 const video=source.match(/^\/api\/google\/creative-media\/youtube\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/)?.[1];
 if(video&&youtubeThumbnails.includes(video))return `/testing/youtube/${video}.webp`;
 const asset=source.match(/^\/api\/google\/creative-media\/(\d+)(?:\?.*)?$/)?.[1];
 if(asset&&googleAssets.includes(asset))return `/testing/google-assets/${asset}.webp`;
 try{const url=new URL(source);return thumbnails[url.origin+url.pathname]??source;}catch{return source;}
}
/** Preserve email HTML while replacing only image sources that have a local copy. */
export function localizeTestingEmailImages(html:string){
 return html.replace(/(\bsrc\s*=\s*["'])(https:\/\/[^"']+)(["'])/gi,(match,prefix:string,source:string,suffix:string)=>{
  const local=localTestingThumbnail(source.replaceAll('&amp;','&'));
  return local?.startsWith('/testing/thumbnails/')?`${prefix}${local}${suffix}`:match;
 });
}
