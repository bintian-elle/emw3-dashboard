import nextEnv from '@next/env';
import pg from 'pg';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

nextEnv.loadEnvConfig(process.cwd());
const directory=path.join(process.cwd(),'public/testing/thumbnails');
const manifestPath=path.join(process.cwd(),'lib/testing-thumbnail-manifest.json');
const hostAllowed=hostname=>/(^|\.)(fbcdn\.net|cdninstagram\.com|googleusercontent\.com|ggpht\.com|redd\.it|redditmedia\.com|klaviyo\.com|cloudfront\.net)$/.test(hostname);
const sources=new Map();
const youtubeIds=new Set();
function collect(value,key=''){
 if(typeof value==='string'){
  if(key==='youtubeVideoId'&&/^[a-zA-Z0-9_-]{11}$/.test(value))youtubeIds.add(value);
  if(!/thumb|image|preview|url/i.test(key)||!value.startsWith('https://'))return;
  try{const url=new URL(value);if(!hostAllowed(url.hostname)||url.username||url.password)return;const identity=url.origin+url.pathname;const existing=sources.get(identity)??[];if(!existing.includes(value))existing.push(value);sources.set(identity,existing);}catch{}
  return;
 }
 if(Array.isArray(value)){for(const item of value)collect(item,key);return;}
 if(value&&typeof value==='object')for(const [name,item] of Object.entries(value))collect(item,name);
}
const pool=new pg.Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
try{
 const rows=await pool.query("select channel,payload from testing_data_snapshots where channel = any($1::text[]) order by updated_at desc",[['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social']]);
 for(const row of rows.rows)collect(row.payload);
 for(const file of ['.state/social/instagram-posts-preview.json','.state/social/instagram-posts.json','.state/google-creatives/pmax-content-testing.json','.state/google-creatives/demand-gen-content-testing.json'])try{collect(JSON.parse(await readFile(file,'utf8')))}catch{}
 await mkdir(directory,{recursive:true});
 let manifest={};try{manifest=JSON.parse(await readFile(manifestPath,'utf8'));}catch{}
 const jobs=[...sources.entries()];let index=0,downloaded=0,existing=0,failed=0;
 async function worker(){while(index<jobs.length){const [identity,urls]=jobs[index++];const name=createHash('sha256').update(identity).digest('hex')+'.webp';const target=path.join(directory,name);try{await readFile(target);manifest[identity]=`/testing/thumbnails/${name}`;existing++;continue;}catch{}
  let success=false;for(const url of urls){try{const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok||!response.headers.get('content-type')?.startsWith('image/'))continue;const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length>12000000)continue;const image=await sharp(bytes,{limitInputPixels:40000000}).rotate().resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();await writeFile(target,image,{flag:'wx'}).catch(error=>{if(error.code!=='EEXIST')throw error});manifest[identity]=`/testing/thumbnails/${name}`;downloaded++;success=true;break;}catch{}}
  if(!success)failed++;
 }}
 await Promise.all(Array.from({length:6},worker));
 const youtubeDirectory='public/testing/youtube';await mkdir(youtubeDirectory,{recursive:true});
 let youtubeManifest=[];try{youtubeManifest=JSON.parse(await readFile('lib/testing-youtube-thumbnails.json','utf8'));}catch{}
 let youtubeMissing=0;
 for(const id of youtubeIds){
  const target=path.join(youtubeDirectory,`${id}.webp`);try{await readFile(target);if(!youtubeManifest.includes(id))youtubeManifest.push(id);continue;}catch{}
  try{
   let bytes;try{bytes=await readFile(path.join('.state/google-creatives/youtube-thumbnails',`${id}.jpg`));}catch{const response=await fetch(`https://img.youtube.com/vi/${id}/mqdefault.jpg`,{redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('unavailable');bytes=Buffer.from(await response.arrayBuffer());}
   const image=await sharp(bytes,{limitInputPixels:40000000}).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();await writeFile(target,image);youtubeManifest.push(id);
  }catch{youtubeMissing++;}
 }
 await writeFile('lib/testing-youtube-thumbnails.json',JSON.stringify([...new Set(youtubeManifest)].sort(),null,2)+'\n');
 // Search creatives can already have permanent originals in the local archive.
 let googleAssets=[];try{googleAssets=JSON.parse(await readFile('lib/testing-google-asset-thumbnails.json','utf8'));}catch{}
 try{
  const archive=JSON.parse(await readFile('.state/google-creatives/archive.json','utf8'));
  await mkdir('public/testing/google-assets',{recursive:true});
  for(const id of new Set(archive.assets.filter(row=>row.asset?.localMediaPath).map(row=>row.asset.id))){
   if(!/^\d+$/.test(id)||googleAssets.includes(id))continue;
   try{await sharp(path.join('.state/google-creatives/media',id),{limitInputPixels:40000000}).resize({width:320,height:320,fit:'inside',withoutEnlargement:true}).webp({quality:80}).toFile(`public/testing/google-assets/${id}.webp`);googleAssets.push(id);}catch{}
  }
 }catch{}
 await writeFile('lib/testing-google-asset-thumbnails.json',JSON.stringify([...new Set(googleAssets)].sort(),null,2)+'\n');
 await writeFile(manifestPath,JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
 const {buildInsightAssets}=await import('../../lib/testing-insight-assets.ts');
 const {default:social}=await import('../../lib/instagram-post-metadata.ts');
 const localUrl=value=>{if(!value)return undefined;try{const u=new URL(value);return manifest[u.origin+u.pathname];}catch{return value.startsWith('/')?value:undefined;}};
 const safeLink=value=>{if(!value)return undefined;if(value.startsWith('/'))return value;try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||[...u.searchParams.keys()].some(key=>/token|signature|sig|auth|credential/i.test(key)))return undefined;return u.href;}catch{return undefined;}};
 let previous=[];try{previous=JSON.parse(await readFile('lib/testing-insight-assets-local.json','utf8'));}catch{}
 const priorByKey=new Map(previous.map(asset=>[`${asset.channel}:${asset.id}`,asset]));
 const {creativeNamesIndex,restoreCreativeNames}=await import('../../lib/testing-creative-materials.ts');
 const nameIndex=creativeNamesIndex(previous);
 const catalogue=new Map();
 social.forEach((post,index)=>catalogue.set(`social:${post.code}`,{id:post.code,channel:'social',name:`Post ${index+1}`,aliases:[`Post #${index+1}`],kind:post.mediaType??'Post',image:post.thumbnailUrl,url:post.url,description:post.caption}));
 for(const row of rows.rows)for(const asset of buildInsightAssets(row.channel,restoreCreativeNames(row.channel,row.payload,nameIndex))){
  const key=`${asset.channel}:${asset.id}`;if(catalogue.has(key))continue;
  const socialPost=row.channel==='social'?social.find(post=>post.code===asset.id):undefined;
  const prior=priorByKey.get(key),image=socialPost?.thumbnailUrl??localUrl(asset.image)??prior?.image,url=localUrl(asset.url)??safeLink(asset.url)??prior?.url;
  // Existing snapshot references depend on the original saved name. Keep it stable;
  // a renamed creative stays in new snapshots until it is explicitly versioned.
  catalogue.set(key,{...asset,name:prior?.name??asset.name,...(image?{image}:{image:undefined}),...(url?{url}:{url:undefined})});
 }
 // Never discard older creative metadata simply because a snapshot is absent today.
 for(const asset of previous){const key=`${asset.channel}:${asset.id}`;if(!catalogue.has(key))catalogue.set(key,asset);}
 await writeFile('lib/testing-insight-assets-local.json',JSON.stringify([...catalogue.values()],null,2)+'\n');
 console.log(JSON.stringify({identified:jobs.length,downloaded,existing,unavailable:failed,youtube:youtubeIds.size,youtubeMissing,metadata:catalogue.size}));
}finally{await pool.end();}
