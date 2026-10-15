import {test} from "node:test";
import assert from "node:assert/strict";
import {isMetaVideo} from "./meta-creative-type.ts";
test("recognizes numbered video names",()=>{for(const name of ['Wave1_Video1_ROPOT','Wave1_Video2_ROPOT','Video3','test-video-foo'])assert.equal(isMetaVideo(name),true);assert.equal(isMetaVideo('Wave1_SingleImage1_ROPOT'),false);});
test("uses real creative metadata even when the name lacks video",()=>{assert.equal(isMetaVideo('Creative 1',{video_id:'1'}),true);assert.equal(isMetaVideo('Creative 2',{asset_feed_spec:{videos:[{video_id:'2'}]}}),true);assert.equal(isMetaVideo('Creative 3',{object_story_spec:{video_data:{video_id:'3'}}}),true);});
