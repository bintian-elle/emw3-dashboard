import nextEnv from '@next/env';
import pg from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
nextEnv.loadEnvConfig(process.cwd());
const file='lib/testing-thumbnail-manifest.json',manifest=JSON.parse(await readFile(file,'utf8'));
const pool=new pg.Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false}});
try{
 const rows=await pool.query("select payload from testing_data_snapshots where channel='meta'");
 const groups=new Map();
 function walk(value,ad,creative){
  if(Array.isArray(value)){value.forEach(item=>walk(item,ad,creative));return;}
  if(!value||typeof value!=='object')return;
  ad=value.adId??ad;creative=value.creativeContent?.id??(value.id&&typeof value.thumbnail_url==='string'?value.id:creative);
  const source=value.thumbnailUrl??value.thumbnail_url;
  if(ad&&creative&&typeof source==='string'){
   let local=source.startsWith('/testing/thumbnails/')?source:undefined,identity;
   try{const url=new URL(source);identity=url.origin+url.pathname;local??=manifest[identity];}catch{}
   const id=`${ad}:${creative}`,group=groups.get(id)??{local:new Set(),missing:new Set()};
   if(local)group.local.add(local);else if(identity)group.missing.add(identity);
   groups.set(id,group);
  }
  Object.values(value).forEach(item=>walk(item,ad,creative));
 }
 rows.rows.forEach(row=>walk(row.payload));
 const candidates=new Map();
 for(const group of groups.values())if(group.local.size===1)for(const identity of group.missing){const local=[...group.local][0],prior=candidates.get(identity);candidates.set(identity,prior===undefined?local:prior===local?local:null);}
 let added=0;for(const [identity,local] of candidates)if(local&&!manifest[identity]){manifest[identity]=local;added++;}
 await writeFile(file,JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a],[b])=>a.localeCompare(b))),null,2)+'\n');
 console.log(JSON.stringify({matched:added,ambiguous:[...candidates.values()].filter(value=>value===null).length}));
}finally{await pool.end();}
