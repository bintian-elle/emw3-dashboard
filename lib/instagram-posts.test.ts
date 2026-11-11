import test from "node:test";
import assert from "node:assert/strict";
import {instagramPostCodes,insightValues} from "./instagram-posts.ts";
test("requested Instagram posts are included exactly once",()=>{
 const requested=["Dd9OpQ6FI6x","DeXHEJtviEW","Deeslonv6bA","De17FAyzMUU","DfAPwh3ztBl"];
 for(const code of requested)assert.equal(instagramPostCodes.filter(item=>item===code).length,1);
});
test("Instagram unavailable metrics stay distinct from genuine zero counts",()=>{
 const result=insightValues([{name:"comments",values:[{value:0}]},{name:"views",values:[{value:631}]},{name:"reach",total_value:{value:587}}]);
 assert.equal(result.comments,0);assert.equal(result.views,631);assert.equal(result.reach,587);assert.equal(result.follows,null);assert.equal(result.saved,null);
});
