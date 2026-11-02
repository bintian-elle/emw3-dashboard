import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildInsightAssets,splitInsightAssetText,safeInsightUrl} from './testing-insight-assets.ts';
const id='430366611794';
test('Google image, video and copy references use real metadata',()=>{
 const assets=buildInsightAssets('google-pmax',{assets:[{asset:{id,name:'Kitchen comparison',type:'IMAGE',imageAsset:{fullSize:{url:'https://example.com/kitchen.png'}}}},{asset:{id:'430366611795',type:'TEXT',textAsset:{text:'Better water every day'}}}],adAssets:[{id:'430366611796',type:'YOUTUBE_VIDEO',youtubeVideoAsset:{youtubeVideoId:'video123',youtubeVideoTitle:'RO demonstration'}}]});
 assert.equal(assets.length,3);const image=assets.find(asset=>asset.id===id)!;assert.equal(image.name,'Kitchen comparison');assert.ok(assets.some(asset=>asset.name==='Better water every day'));assert.ok(assets.some(asset=>asset.url?.includes('youtube.com')));
 assert.deepEqual(splitInsightAssetText(`Asset ${id}: retain.`,assets),['Asset ',image,': retain.']);
});
test('same named creatives never resolve to the wrong object',()=>{
 const assets=[{id,channel:'google-pmax',name:'Creative 2',kind:'IMAGE'},{id:'430366611795',channel:'google-pmax',name:'Creative 2',kind:'IMAGE'}];
 assert.deepEqual(splitInsightAssetText('Creative 2',assets),['Creative 2']);
 assert.equal(typeof splitInsightAssetText(id,assets)[0],'object');
 assert.deepEqual(splitInsightAssetText(`9${id}9; Revenue $340.50`,assets),[`9${id}9; Revenue $340.50`]);
});
test('social names retain page numbering, captions and original links',()=>{
 const assets=buildInsightAssets('social',{posts:[{code:'post-code',caption:'Health matters',url:'https://instagram.com/p/post-code/',mediaType:'IMAGE'}]});
 assert.equal(assets[0].name,'Post 1');assert.equal(assets[0].description,'Health matters');assert.equal(typeof splitInsightAssetText('Post 1',assets)[0],'object');assert.deepEqual(splitInsightAssetText('Post 10',assets),['Post 10']);
});
test('Meta and Reddit use ad names; unsafe URLs and missing names are never invented',()=>{
 const [ad]=buildInsightAssets('meta',{data:{campaigns:[{adGroups:[{activeAds:[{adId:id,name:'Feel It — kitchen',thumbnailUrl:'https://example.com/ad.png',postUrl:'javascript:alert(1)'}]}]}]}});
 assert.equal(ad.name,'Feel It — kitchen');assert.equal(ad.url,undefined);assert.equal(safeInsightUrl('javascript:alert(1)'),undefined);
 const [unnamed]=buildInsightAssets('google-pmax',{assets:[{asset:{id,type:'IMAGE'}}]});assert.ok(!unnamed.name.includes(id));
});

test('unmatched labelled identifiers stay in details, never masquerade as named creatives',()=>{
 const parts=splitInsightAssetText('Replace Asset ID: 998877665544.',[]);
 assert.equal(typeof parts[1],'object');assert.ok(!JSON.stringify(parts[1]&&typeof parts[1]==='object'?parts[1].name:'').includes('998877665544'));
 assert.deepEqual(splitInsightAssetText('Revenue $340.50; 2026-10-23',[]),['Revenue $340.50; 2026-10-23']);
});
