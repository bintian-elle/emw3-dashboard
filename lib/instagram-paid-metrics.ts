import type {SocialPost,SocialMetric} from "./instagram-posts";
export type PaidAction={action_type:string;value:string};
export type PaidInsight={ad_id?:string;impressions?:string;reach?:string;actions?:PaidAction[];video_play_actions?:PaidAction[]};
export type InstagramAdCreative={source_instagram_media_id?:string;effective_instagram_media_id?:string;instagram_permalink_url?:string};
export function matchesInstagramPost(post:SocialPost,creative:InstagramAdCreative){return !!((post.id&&(creative.source_instagram_media_id===post.id||creative.effective_instagram_media_id===post.id))||creative.instagram_permalink_url?.includes(`/${post.code}/`));}
export function paidInstagramMetrics(row:PaidInsight,isVideo:boolean):Record<SocialMetric,number|null>{
 const num=(value:string|undefined)=>value==null?null:Number.isFinite(Number(value))?Number(value):null;
 const action=(types:string[])=>{const found=types.map(type=>row.actions?.find(item=>item.action_type===type)).find(Boolean);return found?num(found.value):row.actions?0:null;};
 const follows=row.actions?.find(item=>item.action_type==="instagram_profile_follow");
 return {views:isVideo?row.video_play_actions?.reduce((sum,item)=>sum+Number(item.value),0)??null:num(row.impressions),reach:num(row.reach),likes:action(["onsite_conversion.post_net_like","post_reaction"]),comments:action(["comment"]),shares:action(["post"]),saved:action(["onsite_conversion.post_net_save","onsite_conversion.post_save"]),follows:follows?num(follows.value):null};
}
