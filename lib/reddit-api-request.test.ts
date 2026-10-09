import {test} from "node:test";
import assert from "node:assert/strict";
import {createRedditRequester} from "./reddit-api-request.ts";

test("coalesces simultaneous identical report reads and retries transient 500", async()=>{
 let calls=0;
 const waits:number[]=[];
 const request=createRedditRequester({fetcher:async()=>{calls++;return calls===1?new Response("upstream failure",{status:500}):Response.json({value:7});},pause:async ms=>{waits.push(ms);}});
 const results=await Promise.all([request("/reports",{method:"POST",body:"same period"}),request("/reports",{method:"POST",body:"same period"})]);
 assert.deepEqual(results,[{value:7},{value:7}]);assert.equal(calls,2);assert.deepEqual(waits,[500]);
});

test("bounds parallel requests across different periods",async()=>{
 let active=0,max=0;
 const request=createRedditRequester({concurrency:2,fetcher:async()=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,5));active--;return Response.json({});}});
 await Promise.all(Array.from({length:8},(_,i)=>request(`/reports/${i}`)));
 assert.equal(max,2);
});

test("limits retries, hides response bodies and releases failed requests for retry",async()=>{
 let calls=0;
 const request=createRedditRequester({fetcher:async()=>{calls++;return new Response("private upstream body",{status:503});},pause:async()=>{}});
 await assert.rejects(request("/reports"),error=>error instanceof Error&&error.message.includes("HTTP 503")&&!error.message.includes("private"));
 assert.equal(calls,3);
 await assert.rejects(request("/reports"));assert.equal(calls,6);
});

test("does not retry authorization errors",async()=>{
 let calls=0;
 const request=createRedditRequester({fetcher:async()=>{calls++;return new Response(null,{status:403});}});
 await assert.rejects(request("/reports"));assert.equal(calls,1);
});
