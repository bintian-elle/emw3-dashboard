import test from "node:test";
import assert from "node:assert/strict";
import {SignJWT} from "jose";
import {codexReadPath,validCodexSiteToken} from "./codex-site-access.ts";
test("Codex service can read reports but cannot call AI, authentication or arbitrary API endpoints",()=>{
 for(const [method,path]of [["GET","/"],["GET","/bluevua/testing/social"],["GET","/api/google-ads/overview"],["POST","/api/klaviyo/dashboard"]])assert.equal(codexReadPath(method,path),true);
 for(const [method,path]of [["POST","/api/klaviyo/ask"],["GET","/api/klaviyo/ask/history"],["POST","/api/klaviyo/insights/refresh"],["GET","/api/auth/google"],["DELETE","/bluevua/testing"],["GET","/api/klaviyo/debug/analysis-payload"]])assert.equal(codexReadPath(method,path),false);
});
test("Codex service tokens need an independent key, correct identity, read scope and short expiry",async()=>{
 const previous=process.env.CODEX_SITE_ACCESS_SECRET;const key="test-service-key-for-verification-only-123456";process.env.CODEX_SITE_ACCESS_SECRET=key;
 const sign=(scope="dashboard:read",expiration="10m",secret=key)=>new SignJWT({scope}).setProtectedHeader({alg:"HS256"}).setSubject("bluevua-cloud-codex").setIssuer("bluevua-cloud-codex").setAudience("dashboard-read-only").setIssuedAt().setExpirationTime(expiration).sign(new TextEncoder().encode(secret));
 try{assert.equal(await validCodexSiteToken(await sign()),true);assert.equal(await validCodexSiteToken(await sign("write")),false);assert.equal(await validCodexSiteToken(await sign("dashboard:read","1h")),false);assert.equal(await validCodexSiteToken(await sign("dashboard:read","-1s")),false);assert.equal(await validCodexSiteToken(await sign("dashboard:read","10m","wrong-key")),false);assert.equal(await validCodexSiteToken(undefined),false);}finally{if(previous===undefined)delete process.env.CODEX_SITE_ACCESS_SECRET;else process.env.CODEX_SITE_ACCESS_SECRET=previous;}
});
