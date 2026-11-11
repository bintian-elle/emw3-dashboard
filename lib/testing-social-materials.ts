import postMetadata from './instagram-post-metadata.ts';
import {instagramThumbnailSources} from './instagram-thumbnail-sources.ts';

const localPosts=new Map(postMetadata.map(post=>[post.code,post]));
type RecordValue=Record<string,unknown>;
const object=(value:unknown):value is RecordValue=>!!value&&typeof value==='object'&&!Array.isArray(value);
const fields=['id','url','caption','publishedAt','mediaType'] as const;
/** Remove only fields that match the checked-in identity exactly. Unknown posts stay complete. */
export function externalizeSocialMaterials<T>(value:T):T{
 if(!object(value)||!Array.isArray(value.posts))return value;
 return {...value,posts:value.posts.map(post=>{
  if(!object(post)||typeof post.code!=='string')return post;
  const local=localPosts.get(post.code);if(!local)return post;
  const result={...post};
  for(const field of fields)if(result[field]===local[field])delete result[field];
  if(typeof result.thumbnailUrl==='string'){try{if(new URL(result.thumbnailUrl).protocol==='https:'&&new URL(result.thumbnailUrl).pathname===instagramThumbnailSources[post.code])delete result.thumbnailUrl;}catch{/* Preserve unknown source values. */}}
  if(result.thumbnailUrl===local.thumbnailUrl)delete result.thumbnailUrl;
  return result;
 })} as T;
}
/** Reconstruct the original post shape from the local catalogue and period metrics. */
export function restoreSocialMaterials<T>(value:T):T{
 if(!object(value)||!Array.isArray(value.posts))return value;
 return {...value,posts:value.posts.map(post=>{
  if(!object(post)||typeof post.code!=='string')return post;
  const local=localPosts.get(post.code);return local?{...local,...post}:post;
 })} as T;
}
