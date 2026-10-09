import test from "node:test";
import assert from "node:assert/strict";
import {groupAssociatedAssets} from "./google-associated-assets.ts";
import type {AssetAssociation} from "./google-associated-assets.ts";
const rows:AssetAssociation[]=[
 {campaign:{id:"c"},campaignAsset:{fieldType:"SITELINK"},asset:{id:"shared",type:"SITELINK"}},
 {campaign:{id:"c"},campaignAsset:{fieldType:"SITELINK"},asset:{id:"shared",type:"SITELINK"}},
 {campaign:{id:"c"},adGroup:{id:"g"},adGroupAsset:{fieldType:"SITELINK"},asset:{id:"shared",type:"SITELINK"}},
 {campaign:{id:"c"},adGroup:{id:"g"},adGroupAsset:{fieldType:"BUSINESS_LOGO"},asset:{id:"logo",type:"IMAGE"}},
 {campaign:{id:"c"},adGroup:{id:"other"},asset:{id:"wrong-group",type:"IMAGE"}},
 {campaign:{id:"other"},asset:{id:"wrong-campaign",type:"IMAGE"}},
];
test("separates association scopes, deduplicates within each scope, and excludes unrelated groups",()=>{
 const [group,campaign]=groupAssociatedAssets(rows,"c","g","Campaign","Group");assert.equal(group.count,2);assert.equal(campaign.count,1);assert.equal(group.sourceName,"Group");assert.equal(campaign.sourceName,"Campaign");assert.ok(group.categories.some(category=>category.label==="Logos"));assert.ok(group.categories.some(category=>category.items.some(row=>row.asset.id==="shared")));assert.equal(campaign.categories[0].items[0].asset.id,"shared");
});
test("keeps both empty scopes visible with zero counts",()=>assert.deepEqual(groupAssociatedAssets([],"c","g","Campaign","Group").map(scope=>scope.count),[0,0]));
