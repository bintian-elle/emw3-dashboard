// Run from the Dashboard checkout; emits only task-scoped creative input, never credentials.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(path.join(process.cwd(),'package.json'));
const env=require('@next/env');const {Pool}=require('pg');
env.loadEnvConfig(process.cwd());
const output=process.argv[2];if(!output)throw Error('Output path required');
const pool=new Pool({connectionString:process.env.KLAVIYO_DATABASE_URL,ssl:{rejectUnauthorized:false},connectionTimeoutMillis:15000});
try{
 const result=await pool.query("select body->'analysis_payload' payload from ai_job_queue where body->>'dashboard_id'='bluevua-content-testing' and body->'analysis_payload' is not null order by created_at desc limit 1");
 const saved={};for(const name of ['content-testing-inventory','pmax-content-testing','demand-gen-content-testing']){try{saved[name]=JSON.parse(await readFile(path.join(process.cwd(),'.state/google-creatives',name+'.json'),'utf8'));}catch{/* explicitly reported in manifest */}}
 try{saved.social=JSON.parse(await readFile('.state/social/instagram-posts.json','utf8'));}catch{}
 const warnings=[];
 let googleAccessToken;
 async function google(query){
  if(!googleAccessToken){const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:process.env.GOOGLE_ADS_CLIENT_ID,client_secret:process.env.GOOGLE_ADS_SECRET,refresh_token:process.env.GOOGLE_ADS_TOKEN,grant_type:'refresh_token'}),signal:AbortSignal.timeout(30000)});const t=await r.json();if(!r.ok||!t.access_token)throw Error('Google OAuth unavailable');googleAccessToken=t.access_token;}
  const customer=(process.env.GOOGLE_ADS_CUSTOMER_ID??'').replaceAll('-','');const headers={Authorization:`Bearer ${googleAccessToken}`,'Content-Type':'application/json'};
  if(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID)headers['login-customer-id']=process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replaceAll('-','');
  const r=await fetch(`https://googleads.googleapis.com/v24/customers/${customer}/googleAds:searchStream`,{method:'POST',headers,body:JSON.stringify({query}),signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(`Google metadata HTTP ${r.status}`);return(await r.json()).flatMap(batch=>batch.results??[]);
 }
 try{
  const config=await readFile('lib/google-content-testing-scope.ts','utf8');const definition=config.match(/GOOGLE_CONTENT_CAMPAIGNS\s*=\s*\[([^\]]+)\]/)?.[1];const names=[...(definition??'').matchAll(/"([^"]+)"/g)].map(m=>m[1]);
  const labelName=config.match(/GOOGLE_CONTENT_TEST_LABEL\s*=\s*"([^"]+)"/)?.[1];if(!names.length||!labelName)throw Error('Google Search scope not found');
  const label=(await google(`SELECT label.resource_name FROM label WHERE label.name='${labelName}'`))[0]?.label.resourceName;if(!label)throw Error('Testing label not found');
  const ads=await google(`SELECT campaign.id,campaign.name,campaign.status,ad_group.id,ad_group.name,ad_group_ad.status,ad_group_ad.ad.id,ad_group_ad.ad.name,ad_group_ad.ad.type,ad_group_ad.ad.final_urls,ad_group_ad.ad.responsive_search_ad.headlines,ad_group_ad.ad.responsive_search_ad.descriptions FROM ad_group_ad WHERE campaign.name IN (${names.map(n=>`'${n}'`).join(',')}) AND ad_group_ad.labels CONTAINS ANY ('${label}') AND ad_group_ad.status IN ('ENABLED','PAUSED','REMOVED')`);
  saved['content-testing-inventory']={ads};
  const expanded=await readFile('lib/google-expanded-content-testing.ts','utf8');const pmaxNames=[...(expanded.match(/const names\s*=\s*\[([^\]]+)\]/)?.[1]??'').matchAll(/"([^"]+)"/g)].map(m=>m[1]);
  const assetFields='asset.id,asset.name,asset.type,asset.text_asset.text,asset.image_asset.full_size.url,asset.youtube_video_asset.youtube_video_id';
  const inventory=await google(`SELECT campaign.id,campaign.name,campaign.status,asset_group.id,asset_group.name,asset_group.status FROM asset_group WHERE campaign.name IN (${pmaxNames.map(n=>`'${n}'`).join(',')}) AND asset_group.name LIKE '%Content Testing%'`);
  const assets=inventory.length?await google(`SELECT asset_group.id,asset_group_asset.field_type,${assetFields} FROM asset_group_asset WHERE asset_group.id IN (${inventory.map(r=>r.assetGroup.id).join(',')}) AND asset_group_asset.status != 'REMOVED'`):[];
  saved['pmax-content-testing']={inventory,assets,adAssets:[]};
  const dgName=expanded.match(/campaign.name='(EM-DG-[^']+)'/)?.[1];const groupId=expanded.match(/ad_group.id\s*=\s*(\d+)/)?.[1];if(!dgName||!groupId)throw Error('Demand Gen scope not found');
  const fields=['marketing_images','square_marketing_images','portrait_marketing_images','tall_portrait_marketing_images','headlines','descriptions'].map(f=>`ad_group_ad.ad.demand_gen_multi_asset_ad.${f}`).concat(['videos','headlines','descriptions'].map(f=>`ad_group_ad.ad.demand_gen_video_responsive_ad.${f}`));
  const dg=await google(`SELECT campaign.id,campaign.name,campaign.status,ad_group.id,ad_group.name,ad_group.status,ad_group_ad.status,ad_group_ad.ad.id,ad_group_ad.ad.name,ad_group_ad.ad.type,${fields.join(',')} FROM ad_group_ad WHERE campaign.name='${dgName}' AND ad_group.id=${groupId} AND ad_group_ad.ad.name LIKE '%content testing%'`);
  const ids=new Set();function scan(value){if(Array.isArray(value))value.forEach(scan);else if(value&&typeof value==='object'){if(typeof value.asset==='string')ids.add(value.asset.split('/').at(-1));Object.values(value).forEach(scan);}}dg.forEach(scan);
  const adAssets=ids.size?await google(`SELECT ${assetFields} FROM asset WHERE asset.id IN (${[...ids].join(',')})`):[];
  saved['demand-gen-content-testing']={inventory:dg,assets:[],adAssets:adAssets.map(r=>r.asset)};
 }catch(error){warnings.push(error.message);}
 const graphMetadata={};
 const token=process.env.META_ACCESS_TOKEN;
 async function graph(id,fields,extra={}){if(!token)return null;const url=new URL(`https://graph.facebook.com/v25.0/${id}`);if(fields)url.searchParams.set('fields',fields);for(const [key,value]of Object.entries(extra))url.searchParams.set(key,value);const res=await fetch(url,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(25000)});const body=await res.json();return res.ok?body:{unavailable:true,code:body.error?.code??res.status};}
 for(const post of saved.social?.posts??[]){if(post.id)graphMetadata[post.id]=await graph(post.id,'id,media_type,media_url,thumbnail_url,caption,children{id,media_type,media_url,thumbnail_url}');}
 const catalog=result.rows[0]?.payload?.creative_catalog??{};
 const metaConfig=await readFile('lib/testing-meta.ts','utf8');const metaScope=[...(metaConfig.match(/META_CAMPAIGN_IDS\s*=\s*\[([^\]]+)\]/)?.[1]??'').matchAll(/"(\d+)"/g)].map(m=>m[1]);
 for(const [name,c] of Object.entries(catalog))if(c?.adGroups&&!metaScope.includes(c.campaignId))delete catalog[name];
 for(const id of metaScope)if(!Object.values(catalog).some(c=>c?.campaignId===id)){
  const campaign=await graph(id,'id,name');const groups=await graph(`${id}/adsets`,'id,name',{limit:'100'});
  if(campaign?.name)catalog[campaign.name]={campaignId:id,campaignName:campaign.name,adGroups:(groups?.data??[]).map(g=>({adGroupId:g.id,name:g.name,activeAds:[]}))};else warnings.push('Configured Meta campaign unavailable');
 }
 for(const [name,campaign] of Object.entries(catalog))if(campaign?.adGroups&&campaign?.campaignId){
  const fresh=await graph(`${campaign.campaignId}/ads`,'id,name,adset_id,configured_status,effective_status,creative{id,body,title,thumbnail_url,video_id,object_type,asset_feed_spec,object_story_spec}',{limit:'100'});
  if(fresh?.data){const groups=new Map();for(const ad of fresh.data){const oldGroup=campaign.adGroups.find(g=>g.adGroupId===ad.adset_id);const group=groups.get(ad.adset_id)??{adGroupId:ad.adset_id,name:oldGroup?.name??ad.adset_id,activeAds:[]};groups.set(ad.adset_id,group);const old=oldGroup?.activeAds?.find(a=>a.adId===ad.id)??{};const video=Boolean(ad.creative?.video_id||ad.creative?.object_story_spec?.video_data||ad.creative?.asset_feed_spec?.videos?.length);group.activeAds.push({...old,adId:ad.id,name:ad.name,mediaType:video?'Video':'Image',thumbnailUrl:ad.creative?.thumbnail_url??old.thumbnailUrl,creativeContent:ad.creative});}campaign.adGroups=[...groups.values()];}
  else warnings.push('Meta current ad inventory unavailable');
 }

 for(const campaign of Object.values(catalog))for(const group of campaign?.adGroups??[])for(const ad of group.activeAds??[]){
  if(ad.creativeContent?.id)graphMetadata[ad.creativeContent.id]=await graph(ad.creativeContent.id,'id,image_url,thumbnail_url,video_id,object_story_spec,asset_feed_spec');
  const creative=graphMetadata[ad.creativeContent?.id]??ad.creativeContent;
  const ids=new Set([creative?.video_id,...(creative?.asset_feed_spec?.videos??[]).map(v=>v.video_id)]);
  for(const video of ids)if(video&&!graphMetadata[video])graphMetadata[video]=await graph(video,'id,source,title,description');
  for(const video of ids)if(video&&!graphMetadata[video]?.source){
   try{
    const preview=await graph(`${ad.adId}/previews`,null,{ad_format:'MOBILE_FEED_STANDARD'});const iframe=preview?.data?.[0]?.body?.match(/<iframe[^>]+src="([^"]+)"/i)?.[1]?.replaceAll('&amp;','&');
    if(iframe){const page=await fetch(iframe,{signal:AbortSignal.timeout(25000)});const html=(await page.text()).replaceAll('\\/','/').replaceAll('\\u0026','&').replaceAll('&amp;','&');
     const urls=html.match(/https:\/\/[^"\\\s<>]+\.mp4[^"\\\s<>]*/g)??[];
     for(const source of urls){const media=await fetch(source,{method:'HEAD',signal:AbortSignal.timeout(15000)});if(media.ok&&media.headers.get('content-type')?.startsWith('video/')){graphMetadata[video]={...graphMetadata[video],source,source_basis:'Authorized ad preview media',source_ad_id:ad.adId};break;}}
    }
   }catch{/* preserve the explicit missing-source gap */}
  }

 }
 const hashes=[...new Set(Object.values(graphMetadata).flatMap(row=>(row?.asset_feed_spec?.images??[]).map(image=>image.hash)).filter(Boolean))];
 if(hashes.length)graphMetadata.meta_images=await graph('act_1010265054378515/adimages','hash,url',{hashes:JSON.stringify(hashes),limit:'100'});
 const redditPosts={};
 try{
  const credentials=JSON.parse(await readFile('credentials/reddit.json','utf8'));
  const oauth=await fetch('https://www.reddit.com/api/v1/access_token',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${credentials.CLIENT_ID}:${credentials.CLIENT_SECRET}`).toString('base64')}`,'Content-Type':'application/x-www-form-urlencoded','User-Agent':'BluevuaTestingCreativeLibrary/1.0'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:credentials.refresh_token}),signal:AbortSignal.timeout(20000)});
  const session=await oauth.json();
  if(session.access_token){
   const headers={Authorization:`Bearer ${session.access_token}`,'User-Agent':'BluevuaTestingCreativeLibrary/1.0'};
   const response=await fetch(`https://ads-api.reddit.com/api/v3/ad_accounts/${credentials.Ad_Account_ID}/ads`,{headers,signal:AbortSignal.timeout(20000)});const ads=await response.json();
   const scopeText=await readFile('lib/reddit-content-testing.ts','utf8');
   const configuredStrings=new Set([...scopeText.matchAll(/"([^"]+)"/g)].map(m=>m[1]));
   const scopeGroups=new Map([...scopeText.matchAll(/name:\s*"([^"]+)"[\s\S]*?groups:\s*\[([^\]]*)\]/g)].map(m=>[m[1],[...m[2].matchAll(/"([^"]+)"/g)].map(x=>x[1])]));
   const campaignsResponse=await fetch(`https://ads-api.reddit.com/api/v3/ad_accounts/${credentials.Ad_Account_ID}/campaigns`,{headers,signal:AbortSignal.timeout(20000)});const campaigns=await campaignsResponse.json();
   for(const name of Object.keys(catalog))if(name.startsWith('EM-Reddit-')&&!scopeGroups.has(name))delete catalog[name];
   for(const campaign of campaigns.data??[])if(scopeGroups.has(campaign.name)&&!catalog[campaign.name])catalog[campaign.name]={name:campaign.name,campaignId:campaign.id,groups:[]};

   const wanted=new Set(Object.entries(catalog).filter(([name])=>name.startsWith('EM-Reddit-')).flatMap(([,c])=>(c.groups??[]).flatMap(g=>(g.activeAds??[]).map(a=>a.adId))));
   for(const ad of ads.data??[])if((wanted.has(ad.id)||configuredStrings.has(ad.name))&&ad.post_id){const r=await fetch(`https://ads-api.reddit.com/api/v3/posts/${ad.post_id}`,{headers,signal:AbortSignal.timeout(20000)});if(r.ok)redditPosts[ad.id]=(await r.json()).data;}
   const groupResponse=await fetch(`https://ads-api.reddit.com/api/v3/ad_accounts/${credentials.Ad_Account_ID}/ad_groups`,{headers,signal:AbortSignal.timeout(20000)});const groups=await groupResponse.json();
   for(const [name,campaign]of Object.entries(catalog))if(name.startsWith('EM-Reddit-')){
    const selected=(ads.data??[]).filter(ad=>ad.campaign_id===campaign.campaignId&&configuredStrings.has(ad.name)&&(scopeGroups.get(name)??[]).includes((groups.data??[]).find(g=>g.id===ad.ad_group_id)?.name?.trim())&&redditPosts[ad.id]);
    if(selected.length){const byGroup=new Map();for(const ad of selected){const post=redditPosts[ad.id];const group=byGroup.get(ad.ad_group_id)??{name:groups.data?.find(g=>g.id===ad.ad_group_id)?.name??ad.ad_group_id,activeAds:[]};byGroup.set(ad.ad_group_id,group);group.activeAds.push({adId:ad.id,name:ad.name,contentType:post.type==='VIDEO'?'Video':post.type==='TEXT'?'Message':'Image',headline:post.headline,body:post.body,thumbnailUrl:post.thumbnail_url,postUrl:post.post_url,videoUrl:post.type==='VIDEO'?post.content?.[0]?.media_url:null});}campaign.groups=[...byGroup.values()];}
   }
  }
 }catch{redditPosts._unavailable=true;warnings.push('Reddit current media metadata unavailable');}
 const input={version:1,exported_at:new Date().toISOString(),analysis:{creative_catalog:catalog},saved,graphMetadata,redditPosts,warnings};
 await mkdir(path.dirname(output),{recursive:true,mode:0o700});await writeFile(output,JSON.stringify(input),{mode:0o600});
 console.log('Creative inventory exported (private file).');
 if(warnings.length){console.error('Current metadata export incomplete: '+warnings.join('; '));process.exitCode=1;}
}finally{await pool.end();}
