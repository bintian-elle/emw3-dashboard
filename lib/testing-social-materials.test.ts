import test from 'node:test';
import assert from 'node:assert/strict';
import metadata from './instagram-post-metadata.ts';
import {instagramThumbnailSources} from './instagram-thumbnail-sources.ts';
import {externalizeSocialMaterials,restoreSocialMaterials} from './testing-social-materials.ts';

test('local post identity can be removed from a snapshot and reconstructed without changing its metrics',()=>{
 const local=metadata[0];
 const post={...local,thumbnailUrl:`https://scontent.example.cdninstagram.com${instagramThumbnailSources[local.code]}?signed=old`,metrics:{views:42},paid:{metrics:{views:12}},status:'partial'};
 const compact=externalizeSocialMaterials({version:2,posts:[post]});
 assert.deepEqual(compact.posts[0],{code:local.code,metrics:{views:42},paid:{metrics:{views:12}},status:'partial'});
 assert.deepEqual(restoreSocialMaterials(compact).posts[0],{...local,metrics:post.metrics,paid:post.paid,status:post.status});
 assert.equal(post.caption,local.caption,'the original object is untouched');
});

test('new or changed material stays in the snapshot instead of being lost',()=>{
 const local=metadata[0],changed={...local,caption:'An edited caption',thumbnailUrl:'https://example.com/different.jpg'},unknown={code:'new-post',caption:'New post'};
 const result=externalizeSocialMaterials({posts:[changed,unknown]});
 assert.equal(result.posts[0].caption,'An edited caption');
 assert.equal('thumbnailUrl' in result.posts[0]&&result.posts[0].thumbnailUrl,'https://example.com/different.jpg');
 assert.deepEqual(result.posts[1],unknown);
 assert.equal(restoreSocialMaterials(result).posts[0].caption,'An edited caption');
});
