import {instagramPostCodes,socialMetrics} from './instagram-posts.ts';

/** Match the Social page's shared and local snapshot eligibility. */
export function isSocialSnapshot(value:unknown):value is {version:2;posts:unknown[];capturedAt?:unknown}{
 if(!value||typeof value!=='object')return false;
 const candidate=value as {version?:unknown;posts?:unknown};
 return candidate.version===2&&Array.isArray(candidate.posts)&&candidate.posts.length>0;
}

/** Scheduled runs skip only a complete capture of every configured post. */
export function isCompleteSocialSnapshot(value:unknown):boolean{
 if(!isSocialSnapshot(value)||value.posts.length!==instagramPostCodes.length)return false;
 const expected=new Set<string>(instagramPostCodes),seen=new Set<string>();
 for(const item of value.posts){
  if(!item||typeof item!=='object')return false;
  const post=item as {code?:unknown;status?:unknown;metrics?:unknown;paid?:{status?:unknown;metrics?:unknown}};
  if(typeof post.code!=='string'||!expected.has(post.code)||seen.has(post.code))return false;
  if(post.status!=='available'&&post.status!=='partial')return false;
  if(!post.metrics||typeof post.metrics!=='object'||post.paid?.status!=='available'||!post.paid.metrics||typeof post.paid.metrics!=='object')return false;
  const metrics=post.metrics as Record<string,unknown>,paid=post.paid.metrics as Record<string,unknown>;
  const valid=(item:unknown)=>item===null||(typeof item==='number'&&Number.isFinite(item)&&item>=0);
  if(!socialMetrics.every(metric=>metric in metrics&&metric in paid&&valid(metrics[metric])&&valid(paid[metric])))return false;
  seen.add(post.code);
 }
 return seen.size===expected.size;
}

/** Return the time of the snapshot actually chosen by the Social page. */
export function socialDisplayTimestamp(shared:unknown,sharedUpdatedAt:unknown,local:unknown):string|null{
 const value=isSocialSnapshot(shared)?sharedUpdatedAt:isSocialSnapshot(local)?local.capturedAt:null;
 if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))return null;
 return new Date(value).toISOString();
}
