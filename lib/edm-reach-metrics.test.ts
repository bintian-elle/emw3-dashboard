import {test} from "node:test";
import assert from "node:assert/strict";
import {singleBucketUniqueRecipients} from "./edm-reach-metrics.ts";
test("uses API deduplicated recipients, not delivered message count",()=>assert.equal(singleBucketUniqueRecipients([26717]),26717));
test("never adds month-level unique counts into a fake period total",()=>assert.equal(singleBucketUniqueRecipients([26717,25000]),null));
test("empty buckets do not create duplicate recipients",()=>{assert.equal(singleBucketUniqueRecipients([0,26717,0]),26717);assert.equal(singleBucketUniqueRecipients([]),0);});
