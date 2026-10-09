import test from "node:test";
import assert from "node:assert/strict";
import {googleAdsReader} from "./google-ads-creatives.mjs";
const env={GOOGLE_ADS_CLIENT_ID:"client",GOOGLE_ADS_SECRET:"secret",GOOGLE_ADS_TOKEN:"refresh",GOOGLE_ADS_CUSTOMER_ID:"123-456-7890",GOOGLE_ADS_DEVELOPER_TOKEN:"unused"};
test("OAuth-only Google Ads reads omit developer token and flatten all result batches",async()=>{
 const calls=[];const request=async(url,options)=>{calls.push({url,options});return calls.length===1?{ok:true,status:200,json:async()=>({access_token:"access"})}:{ok:true,status:200,json:async()=>[{results:[{campaign:{id:"1"}}]},{results:[{campaign:{id:"2"}}]}]};};
 const search=await googleAdsReader(env,request);const rows=await search("SELECT campaign.id FROM campaign");assert.equal(rows.length,2);assert.equal(calls[1].options.headers["developer-token"],undefined);assert.equal(calls[1].options.headers.Authorization,"Bearer access");assert.ok(calls[1].url.includes("customers/1234567890/"));
});
test("API failures surface codes without exposing OAuth credentials",async()=>{
 let count=0;const search=await googleAdsReader(env,async()=>++count===1?{ok:true,json:async()=>({access_token:"private-access"})}:{ok:false,status:403,json:async()=>[{error:{details:[{errors:[{errorCode:{authorizationError:"USER_PERMISSION_DENIED"}}]}]}}]});
 await assert.rejects(search("SELECT campaign.id FROM campaign"),error=>error.message.includes("USER_PERMISSION_DENIED")&&!error.message.includes("private-access"));
});
