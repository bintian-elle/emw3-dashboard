import {readFile,realpath,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import sharp from 'sharp';

/** Register only cached source assets whose actual campaign references match this report. */
export async function collectCreativeEvidence({library,output,channel,campaigns}){
 if(!campaigns.length||channel==='overview')return [];
 let root,manifest;try{root=await realpath(library);manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));}catch(error){if(error.code==='ENOENT')return [];throw error;}
 const prefix=channel.startsWith('google-')?'google-':channel==='social-media'?'social-':`${channel}-`,results=[];
 for(const [id,asset] of Object.entries(manifest.assets??{})){
  if(!id.startsWith(prefix)||!['image','video'].includes(asset.kind))continue;
  const references=[...new Set((asset.references??[]).map(item=>item.campaign).filter(name=>campaigns.includes(name)))];
  if(!references.length||!asset.image_paths?.length)continue;
  let source;try{source=await realpath(asset.image_paths[0]);}catch{continue;}
  if(!source.startsWith(root+path.sep))continue;
  const raw=await readFile(source),key=createHash('sha256').update(id).update(raw).digest('hex').slice(0,24),file=`${key}.webp`;
  const image=sharp(raw).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:88}),body=await image.toBuffer(),meta=await sharp(body).metadata();
  await writeFile(path.join(output,file),body,{mode:0o600});
  const name=typeof asset.name==='string'&&asset.name.trim()?asset.name:'Creative';
  results.push({key,asset_id:id.slice(prefix.length),name:asset.kind==='video'?`${name} · video storyboard`:name,kind:'image',timestamp_seconds:null,width:meta.width,height:meta.height,file,sha256:createHash('sha256').update(body).digest('hex'),campaigns:references});
 }
 return results;
}
