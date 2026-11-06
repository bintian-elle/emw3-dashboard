import 'server-only';
import {readFile} from 'node:fs/promises';import path from 'node:path';
import {readTestingDataSnapshot} from './testing-data-cache';
import {getTestingInventory} from './testing-inventory';
import type {TestingDataChannel} from './testing-data-cache-contract';
/** Supply any matching dashboard snapshots and identities; the prompt directs the AI to fill missing data via its API access. */
export async function captureManualFallback(input:{channel:string;campaign:string;start:string;end:string;comparison:{start:string;end:string}|null}){
 const channel=input.channel,period={start:input.start,end:input.end},comparison=input.comparison??{start:'',end:''};
 let campaigns:string[]=[];if(input.campaign!=='all'){const inventory=await getTestingInventory();if(!inventory.items.some(item=>item.channelKey===channel&&item.name===input.campaign))throw Error('Campaign is outside the configured testing scope.');campaigns=[input.campaign];}else if(channel==='social-media')campaigns=['social-selected-posts'];else if(channel!=='overview'){const inventory=await getTestingInventory();if(inventory.unavailable.includes(channel as never))throw Error(`Campaign inventory is unavailable for ${channel}`);campaigns=inventory.items.filter(item=>item.channelKey===channel).map(item=>item.name);if(!campaigns.length)throw Error(`Campaign inventory is empty for ${channel}`);}
 const prompt=await readFile(path.join(process.cwd(),'prompts/content-testing',`${channel}.md`),'utf8');const sections=[...prompt.matchAll(/^##\s+\d+\.\s+(.+)$/gm)].slice(1).map((m,i)=>({id:`${channel}-${i+2}`,title:m[1]}));
 const storageChannel=(channel==='social-media'?'social':channel) as TestingDataChannel;
 const snapshots=channel==='overview'?[]:await Promise.allSettled([period,comparison].map(range=>readTestingDataSnapshot(storageChannel,{preset:'custom',...range})));
 const dashboard=snapshots.map((result,index)=>({period:index===0?period:comparison,...(result.status==='fulfilled'&&result.value?{snapshot:result.value}:{unavailable:true})}));
 const datasets={input:{id:'input',scopes:['channel',...campaigns],xKey:'category',columns:{category:'category'},rows:[]}};
 return {channel,period,comparison,campaigns,dashboard,tests:campaigns.map(test_id=>({test_id})),presentation_datasets:datasets,media_index:[],source_data_gaps:['Some requested dashboard snapshots are unavailable.'],visual_context:{run_id:'manual',channel,scope:'period',period,comparison,currency:null,totals:{},datasets,source_urls:[],media:[],sections}};
}
