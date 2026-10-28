import test from "node:test";
import assert from "node:assert/strict";
import {fetchInstagramInsights,InstagramUnsupportedMetric,isInstagramUnsupportedMetric} from "./testing-social-insights.ts";

test("an upstream failure rejects instead of returning partial insights", async () => {
  await assert.rejects(fetchInstagramInsights(["views", "likes"], async metric => {
    if (metric === "views,likes") throw Error("Instagram API unavailable (500)");
    return [metric];
  }), /500/);
});

test("an explicitly unsupported metric may be omitted while valid metrics remain", async () => {
  const values = await fetchInstagramInsights(["views", "likes"], async metric => {
    if (metric === "views,likes" || metric === "likes") throw new InstagramUnsupportedMetric("unsupported");
    return [{name:"views",value:7}];
  });
  assert.deepEqual(values, [{name:"views",value:7}]);
  assert.equal(isInstagramUnsupportedMetric(100,"The value must be a valid insights metric"), true);
  assert.equal(isInstagramUnsupportedMetric(100,"Invalid access token"), false);
  assert.equal(isInstagramUnsupportedMetric(500,"Invalid metric"), false);
});

test("a failed individual metric rejects even after unsupported-metric fallback", async () => {
  await assert.rejects(fetchInstagramInsights(["views", "likes"], async metric => {
    if (metric === "views,likes") throw new InstagramUnsupportedMetric("unsupported");
    if (metric === "likes") throw Error("Instagram API unavailable (500)");
    return [{name:"views",value:7}];
  }), /500/);
});
