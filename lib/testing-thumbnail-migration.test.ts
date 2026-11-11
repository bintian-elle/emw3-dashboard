import test from 'node:test';
import assert from 'node:assert/strict';
import {localizeSnapshotThumbnails} from './testing-thumbnail-migration.ts';

test('only verified thumbnail URLs move to local paths; metrics and full-size media remain intact',()=>{
 const original={data:{thumbnailUrl:'https://example.com/cached.jpg',spend:12,ads:[{thumbnail_url:'https://example.com/missing.jpg',imageAsset:{url:'https://example.com/cached.jpg'}}]}};
 const updated=localizeSnapshotThumbnails(original,source=>source.endsWith('/cached.jpg')?'/testing/thumbnails/example.webp':source);
 assert.deepEqual(updated,{data:{thumbnailUrl:'/testing/thumbnails/example.webp',spend:12,ads:[{thumbnail_url:'https://example.com/missing.jpg',imageAsset:{url:'https://example.com/cached.jpg'}}]}});
 assert.equal(original.data.thumbnailUrl,'https://example.com/cached.jpg');
});
