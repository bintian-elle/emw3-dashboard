import test from "node:test";
import assert from "node:assert/strict";
import {insightValues} from "./instagram-posts.ts";
test("Instagram unavailable metrics stay distinct from genuine zero counts",()=>{
 const result=insightValues([{name:"comments",values:[{value:0}]},{name:"views",values:[{value:631}]},{name:"reach",total_value:{value:587}}]);
 assert.equal(result.comments,0);assert.equal(result.views,631);assert.equal(result.reach,587);assert.equal(result.follows,null);assert.equal(result.saved,null);
});
