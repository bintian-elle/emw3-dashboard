export type TestingInventoryChannel='google-search'|'google-pmax'|'google-demand-gen'|'meta'|'reddit'|'edm';
export type TestingInventoryItem={id:string;channel:string;channelKey:TestingInventoryChannel;name:string;status:string;href:string};
export type TestingInventory={items:TestingInventoryItem[];unavailable:TestingInventoryChannel[]};
export type InventoryCampaign={id:string;name:string;status?:string};
export type InventorySources=Record<TestingInventoryChannel,InventoryCampaign[]|null>;

const details:Record<TestingInventoryChannel,{label:string;path:string}>={
 'google-search':{label:'Google Search',path:'/bluevua/testing/google/search'},
 'google-pmax':{label:'Google PMAX',path:'/bluevua/testing/google/pmax'},
 'google-demand-gen':{label:'Google Demand Gen',path:'/bluevua/testing/google/demand-gen'},
 meta:{label:'Meta',path:'/bluevua/testing/meta'},reddit:{label:'Reddit',path:'/bluevua/testing/reddit'},edm:{label:'EDM',path:'/bluevua/testing/edm'},
};

/** Transform published campaign rows, counting each campaign once per channel. */
export function buildTestingInventory(sources:InventorySources):TestingInventory{
 const items:TestingInventoryItem[]=[];const unavailable:TestingInventoryChannel[]=[];
 for(const channelKey of Object.keys(details) as TestingInventoryChannel[]){
  const campaigns=sources[channelKey];
  if(campaigns===null){unavailable.push(channelKey);continue;}
  const distinct=new Map(campaigns.map(campaign=>[campaign.id,campaign]));
  for(const campaign of distinct.values()){
   const channel=details[channelKey],query=new URLSearchParams({campaign:campaign.name});
   items.push({id:`${channelKey}:${campaign.id}`,channel:channel.label,channelKey,name:campaign.name,status:campaign.status?.trim()||'Unknown',href:`${channel.path}?${query}`});
  }
 }
 return {items,unavailable};
}

/** An unavailable channel makes its count (and the overall total) unknown. */
export function testingInventoryCount(inventory:TestingInventory,channel?:TestingInventoryChannel):number|null{
 if(channel?inventory.unavailable.includes(channel):inventory.unavailable.length>0)return null;
 return channel?inventory.items.filter(item=>item.channelKey===channel).length:inventory.items.length;
}
