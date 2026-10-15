import test from "node:test";
import assert from "node:assert/strict";
import {paidInstagramMetrics,matchesInstagramPost} from "./instagram-paid-metrics.ts";
import type {SocialPost} from "./instagram-posts.ts";
test("paid results link to original media ID even when the ad has another permalink",()=>{
 const post={id:"original",code:"selected"} as SocialPost;
 assert.equal(matchesInstagramPost(post,{source_instagram_media_id:"original",instagram_permalink_url:"https://www.instagram.com/p/ad-copy/"}),true);
 assert.equal(matchesInstagramPost(post,{source_instagram_media_id:"other"}),false);
});
test("paid video views use plays and Meta deduplicated reach; missing follows are not zero",()=>{
 const metrics=paidInstagramMetrics({impressions:"1901",reach:"1648",video_play_actions:[{action_type:"video_view",value:"1200"}],actions:[{action_type:"onsite_conversion.post_net_like",value:"45"},{action_type:"post_reaction",value:"45"},{action_type:"onsite_conversion.post_save",value:"20"}]},true);
 assert.equal(metrics.views,1200);assert.equal(metrics.reach,1648);assert.equal(metrics.likes,45);assert.equal(metrics.saved,20);assert.equal(metrics.follows,null);
});
