import "server-only";
import {readFile} from "node:fs/promises";
import path from "node:path";

type TextAsset={text?:string;pinnedField?:string};
export type ArchivedAsset={id:string;name?:string;type:string;finalUrls?:string[];textAsset?:{text:string};imageAsset?:{fullSize?:{url:string}};localMediaPath?:string;localMime?:string;youtubeVideoAsset?:{youtubeVideoId:string};sitelinkAsset?:{linkText:string;description1?:string;description2?:string;finalUrls?:string[]};calloutAsset?:{calloutText:string}};
export type CreativeArchive={version:number;source:string;capturedAt:string;campaigns:Array<{id:string;name:string}>;groups:Array<{campaign:{id:string};adGroup:{id:string;name:string;status:string}}>;
 ads:Array<{campaign:{id:string};adGroup:{id:string};adGroupAd:{status:string;ad:{id:string;name?:string;type:string;finalUrls?:string[];responsiveSearchAd?:{headlines?:TextAsset[];descriptions?:TextAsset[];path1?:string;path2?:string}}}}>;
 assets:Array<{campaign:{id:string};adGroup?:{id:string};campaignAsset?:{fieldType:string};adGroupAsset?:{fieldType:string};asset:ArchivedAsset}>;warnings:string[]};
export function creativeArchiveDirectory(){return process.env.GOOGLE_ADS_CREATIVE_DIR||path.join(process.cwd(),".state/google-creatives");}
export async function readGoogleCreativeArchive():Promise<CreativeArchive|null>{
 try {const data=JSON.parse(await readFile(path.join(creativeArchiveDirectory(),"archive.json"),"utf8"));if(data.version!==1||!Array.isArray(data.groups)||!Array.isArray(data.ads))throw Error("Invalid creative archive");return data;}
 catch(error){if((error as NodeJS.ErrnoException).code==="ENOENT")return null;throw error;}
}
export function safeCreativeUrl(value:string|undefined){if(!value)return null;try{const url=new URL(value);return ["https:","http:"].includes(url.protocol)?url.href:null;}catch{return null;}}
