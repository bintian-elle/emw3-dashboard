import test from "node:test";
import assert from "node:assert/strict";
import {validRedditTestingSnapshot,validRedditSharedSnapshot} from "./testing-reddit-snapshot.ts";

const period={start:"2026-10-20",end:"2026-10-26"};
const metrics={spend:1,impressions:200,clicks:4,reach:150,orders:0,revenue:0,ctr:0.02,cpm:5,costPerThousandReach:1/150,cpa:null,cvr:0,roas:0,cpc:0.25};
const ad={...metrics,adId:"a",name:"Ad",headline:null,body:null,thumbnailUrl:null,videoUrl:null,postUrl:null,contentType:"Video"};
const payload={period,periodLabel:"Last Week (Tue–Mon)",campaigns:[{...metrics,campaignId:"c",name:"Campaign",kind:"Awareness",groups:[{...metrics,adGroupId:"g",name:"Group",activeAds:[ad]}]}]};

test("cached Reddit data is usable only for its exact selected period and label",()=>{
 assert.equal(validRedditTestingSnapshot(payload,period,payload.periodLabel),true);
 assert.equal(validRedditTestingSnapshot(payload,{...period,end:"2026-10-27"},payload.periodLabel),false);
 assert.equal(validRedditTestingSnapshot(payload,period,"Month-to-date"),false);
});

test("malformed or incomplete nested data cannot replace the existing page path",()=>{
 assert.equal(validRedditTestingSnapshot(null,period,payload.periodLabel),false);
 const broken=structuredClone(payload);broken.campaigns[0].groups[0].activeAds[0].clicks=NaN;
 assert.equal(validRedditTestingSnapshot(broken,period,payload.periodLabel),false);
 assert.equal(validRedditTestingSnapshot({...payload,campaigns:[{...payload.campaigns[0],groups:null}]},period,payload.periodLabel),false);
});

test("a Reddit snapshot publishes totals and daily trends together for the same period",()=>{
 const daily={channel:"Reddit",rows:[{date:period.start,entityId:"a",assetType:"Video",...metrics}],reach:[{date:period.start,value:150}]};
 assert.equal(validRedditSharedSnapshot({data:payload,daily},period,payload.periodLabel),true);
 assert.equal(validRedditSharedSnapshot({data:payload},period,payload.periodLabel),false);
 assert.equal(validRedditSharedSnapshot({data:payload,daily:{...daily,rows:[{...daily.rows[0],date:"2026-10-19"}]}},period,payload.periodLabel),false);
});
