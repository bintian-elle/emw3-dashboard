import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMetaCreativeLinks } from './meta-creative-links.ts';

test('resolves the actual Facebook permalink', async () => {
  const links = await resolveMetaCreativeLinks('ad', 'creative', async (id) => id === 'creative' ? {effective_object_story_id:'page_post'} : {permalink_url:'https://www.facebook.com/page/posts/post'});
  assert.equal(links.postUrl, 'https://www.facebook.com/page/posts/post');
});
test('uses Instagram permalink without requiring Facebook post access', async () => {
  const links = await resolveMetaCreativeLinks('ad', 'creative', async () => ({instagram_permalink_url:'https://www.instagram.com/p/abc/'}));
  assert.equal(links.postUrl, 'https://www.instagram.com/p/abc/');
});
test('permission failures preserve the ad preview', async () => {
  const links = await resolveMetaCreativeLinks('ad', 'creative', async (id) => {if(id === 'ad')return {preview_shareable_link:'https://www.facebook.com/ads/preview/abc'};throw Error('permission');});
  assert.deepEqual(links,{postUrl:null,previewUrl:'https://www.facebook.com/ads/preview/abc'});
});
test('rejects unsafe URLs and does not invent a public post', async () => {
  const links = await resolveMetaCreativeLinks('ad', 'creative', async () => ({instagram_permalink_url:'javascript:alert(1)',preview_shareable_link:'javascript:alert(1)'}));
  assert.deepEqual(links,{postUrl:null,previewUrl:null});
});
test('inaccessible Facebook post falls back to the shareable preview', async () => {
  const links = await resolveMetaCreativeLinks('ad', 'creative', async (id) => {
    if(id === 'creative') return {effective_object_story_id:'private_post'};
    if(id === 'ad') return {preview_shareable_link:'https://www.facebook.com/ads/preview/fallback'};
    throw Error('post access denied');
  });
  assert.deepEqual(links,{postUrl:null,previewUrl:'https://www.facebook.com/ads/preview/fallback'});
});

test('only expected optional post-link permission errors are non-fatal to snapshot publication',async()=>{
 const {isOptionalMetaLinkPermissionError}=await import('./meta-creative-links.ts');
 const denied=Error("Meta API (400): (#10) This endpoint requires the 'pages_read_engagement' permission or the 'Page Public Content Access' feature.");
 assert.equal(isOptionalMetaLinkPermissionError({fields:'permalink_url'},denied),true);
 assert.equal(isOptionalMetaLinkPermissionError({fields:'spend,impressions,actions'},denied),false);
 assert.equal(isOptionalMetaLinkPermissionError({fields:'permalink_url'},Error('Meta API rate limit (HTTP 429)')),false);
 assert.equal(isOptionalMetaLinkPermissionError({fields:'permalink_url'},Error('OAuth token invalid')),false);
 let failure:unknown;
 const read=async(id:string,params:Record<string,string>)=>{
  try{if(id==='private_post')throw denied;return id==='creative'?{effective_object_story_id:'private_post'}:{preview_shareable_link:'https://www.facebook.com/ads/preview/fallback'};}
  catch(error){if(!isOptionalMetaLinkPermissionError(params,error))failure??=error;throw error;}
 };
 assert.deepEqual(await resolveMetaCreativeLinks('ad','creative',read),{postUrl:null,previewUrl:'https://www.facebook.com/ads/preview/fallback'});
 assert.equal(failure,undefined);
});
