import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import path from "node:path";
import {readYoutubeThumbnail} from "./youtube-thumbnail-cache.ts";
test("thumbnail requests deduplicate and persisted cache works without network",async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),"youtube-cache-")),originalFetch=globalThis.fetch,originalDirectory=process.env.GOOGLE_ADS_CREATIVE_DIR;let calls=0;
 process.env.GOOGLE_ADS_CREATIVE_DIR=directory;
 try{globalThis.fetch=async()=>{calls++;return new Response(new Uint8Array([255,216,255,217]),{headers:{"content-type":"image/jpeg"}});};
 const first=await Promise.all([readYoutubeThumbnail('abcdefghijk'),readYoutubeThumbnail('abcdefghijk')]);assert.equal(calls,1);assert.deepEqual(first[0],first[1]);
 globalThis.fetch=async()=>{throw Error("network should not be used");};assert.deepEqual(await readYoutubeThumbnail('abcdefghijk'),first[0]);
 await assert.rejects(readYoutubeThumbnail('../invalid'),/Invalid YouTube/);
 }finally{globalThis.fetch=originalFetch;if(originalDirectory===undefined)delete process.env.GOOGLE_ADS_CREATIVE_DIR;else process.env.GOOGLE_ADS_CREATIVE_DIR=originalDirectory;await rm(directory,{recursive:true,force:true});}
});
