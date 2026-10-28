import {resolveTestingPeriod} from './testing-period.ts';
import {testingReadoutKey} from './testing-readout-contract.ts';
import type {TestingChatChannel} from './testing-chat-contract';

const obsoleteFields=new Set(['test_frameworks','channel_frameworks','test_goal','hypothesis']);
/** Old records remain readable, but removed framework content never reaches readers or AI. */
export function withoutTestingFramework<T>(value:T):T{
 if(Array.isArray(value))return value.filter(item=>typeof item!=='string'||!/^\s*\[FRAMEWORK\]/.test(item)).map(withoutTestingFramework) as T;
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!obsoleteFields.has(key)).map(([key,item])=>[key,withoutTestingFramework(item)])) as T;
 return value;
}
const channelNames:Record<string,TestingChatChannel>={'Google Search':'google-search','Google PMAX':'google-pmax','Demand Gen':'google-demand-gen',Meta:'meta',Reddit:'reddit',EDM:'edm','Social Media':'social'};
export function testingReadoutCampaignCatalog(records:ReadonlyArray<{payload:unknown}>){
 const campaigns=new Map<string,{channel:TestingChatChannel;campaign:string}>();
 for(const {payload} of records){
  const tests=(payload as {tests?:Array<{channel?:string;test_id?:string;campaign_name?:string|null}>}|null)?.tests;
  for(const test of tests??[]){const channel=channelNames[test.channel??''],campaign=channel==='social'?test.test_id:test.campaign_name??test.test_id;if(channel&&campaign)campaigns.set(`${channel}:${campaign}`,{channel,campaign});}
 }
 return [...campaigns.values()];
}

export function testingReadoutCatalogKeys(latest:string){
 const periods=[{preset:'lastWeek',label:'Last Week (Tue–Mon)'},{preset:'wtd',label:'Week-to-date'},{preset:'mtd',label:'Month-to-date'}] as const;
 return [...periods.map(({preset,label})=>testingReadoutKey({label,...resolveTestingPeriod(latest,{preset})})!), 'period:social-lifetime','period:reddit-lifetime'];
}

/** Concluded lifetime records retain their original goals and hypotheses. */
export function testingReadoutContent<T>(cacheKey:string,payload:T):T{
 return cacheKey.startsWith("period:concluded:") ? payload : withoutTestingFramework(payload);
}
