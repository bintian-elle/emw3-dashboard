import nextEnv from '@next/env';
import pg from 'pg';
import {mkdir,readFile,writeFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {isDeepStrictEqual} from 'node:util';
import {externalizeSocialMaterials,restoreSocialMaterials} from '../../lib/testing-social-materials.ts';
import {localizeSnapshotThumbnails} from '../../lib/testing-thumbnail-migration.ts';
import {creativeNamesIndex,externalizeCreativeNames,restoreCreativeNames} from '../../lib/testing-creative-materials.ts';

nextEnv.loadEnvConfig(process.cwd());
const apply=process.argv.includes('--apply');
const manifest=JSON.parse(await readFile('lib/testing-thumbnail-manifest.json','utf8'));
const names=creativeNamesIndex(JSON.parse(await readFile('lib/testing-insight-assets-local.json','utf8')));
const lookup=source=>{try{const url=new URL(source);return manifest[url.origin+url.pathname]??source;}catch{return source;}};
for(const local of Object.values(manifest)){
 if(typeof local!=='string'||!/^\/testing\/thumbnails\/[a-f0-9]{64}\.webp$/.test(local))throw Error('Invalid local thumbnail reference');
 await stat(path.join('public',local));
}
const pool=new pg.Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:10000});
const db=await pool.connect();
try{
 await db.query('begin');
 const rows=await db.query("select channel,scope_key,payload,updated_at from testing_data_snapshots where channel = any($1::text[]) order by channel,scope_key for update",[['google-search','google-pmax','google-demand-gen','meta','reddit','edm','social']]);
 const changes=[];let socialFields=0,thumbnails=0,creativeNames=0;
 for(const row of rows.rows){
  const before=row.payload;
  const stripped=row.channel==='social'?externalizeSocialMaterials(before):before;
  if(row.channel==='social'){
   const baseline=restoreSocialMaterials(before);
   const restored=restoreSocialMaterials(stripped);
   for(let i=0;i<(before?.posts?.length??0);i++){
    const old=baseline.posts[i],next=restored.posts[i];
    if(!isDeepStrictEqual(old.metrics,next.metrics)||!isDeepStrictEqual(old.paid,next.paid)||old.status!==next.status)throw Error('Social metrics validation failed');
    for(const field of ['id','caption','url','publishedAt','mediaType'])if(old[field]!==next[field])throw Error('Social material validation failed');
    socialFields+=Object.keys(before.posts[i]).filter(key=>!(key in stripped.posts[i])).length;
   }
  }
  const localized=localizeSnapshotThumbnails(stripped,source=>{const local=lookup(source);if(local!==source)thumbnails++;return local;});
  const next=externalizeCreativeNames(row.channel,localized,names);
  if(!isDeepStrictEqual(restoreCreativeNames(row.channel,next,names),restoreCreativeNames(row.channel,localized,names)))throw Error('Creative name validation failed');
  const count=value=>Array.isArray(value)?value.reduce((sum,item)=>sum+count(item),0):value&&typeof value==='object'?Number(typeof value.__localCreativeName==='string')+Object.values(value).reduce((sum,item)=>sum+count(item),0):0;
  creativeNames+=count(next)-count(localized);
  if(!isDeepStrictEqual(before,next))changes.push({channel:row.channel,scope:row.scope_key,before,after:next,updatedAt:row.updated_at});
 }
 if(apply&&changes.length){
  const folder=path.join(process.cwd(),'.state/testing-material-migration');await mkdir(folder,{recursive:true,mode:0o700});
  const backup=path.join(folder,`snapshots-${new Date().toISOString().replaceAll(':','-')}.json`);
  await writeFile(backup,JSON.stringify(changes.map(({channel,scope,before,updatedAt})=>({channel,scope,payload:before,updatedAt}))),{mode:0o600,flag:'wx'});
  for(const change of changes){
   const result=await db.query('update testing_data_snapshots set payload=$3::jsonb where channel=$1 and scope_key=$2 returning payload',[change.channel,change.scope,JSON.stringify(change.after)]);
   if(result.rowCount!==1||!isDeepStrictEqual(result.rows[0].payload,change.after))throw Error('Snapshot verification failed; transaction rolled back');
  }
  await db.query('commit');
  console.log(JSON.stringify({applied:true,rows:changes.length,socialFields,thumbnails,creativeNames,backup}));
 }else{
  await db.query('rollback');
  console.log(JSON.stringify({applied:false,rows:changes.length,socialFields,thumbnails,creativeNames}));
 }
}catch(error){await db.query('rollback').catch(()=>{});throw error;}finally{db.release();await pool.end();}
