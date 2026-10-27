import {contentTestingQuery,type ContentTestingSnapshot} from '../lib/ai-dashboard-content-testing.ts';
import {readFile} from 'node:fs/promises';
import {dashboardProject,PROJECT_SOURCES} from '../lib/ai-dashboard-project.ts';
import {defaultDashboardRange} from '../lib/ai-dashboard-periods.ts';
import {createInterface} from 'node:readline';
import {appendFile} from 'node:fs/promises';
import {querySnapshot,validateQuery,METRICS,SNAPSHOT_RANGE,SOURCES} from '../lib/ai-dashboard.ts';
const audit=process.argv[2];let calls=0;
const testingTool={name:'query_content_testing',description:'Read the actual Bluevua Content Testing page campaign/ad data, with the exact page labels, inventory and metric rules. Never falls back to whole-account campaign/ad reports. Uses the current request reporting period. Optional exact campaign name and channel filter.',annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:'object',additionalProperties:false,properties:{channel:{type:'string',enum:['overview','google-search','google-pmax','google-demand-gen','meta','reddit','edm','concluded']},campaign:{type:'string'}},required:[]}};

const send=(id:unknown,result:unknown)=>process.stdout.write(JSON.stringify({jsonrpc:'2.0',id,result})+'\n');
createInterface({input:process.stdin}).on('line',async line=>{
 let message;
 try{message=JSON.parse(line);if(message.id===undefined)return;
 if(message.method==='initialize')return void send(message.id,{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'dashboard-snapshot-readonly',version:'1.0.0'}});
 if(message.method==='ping')return void send(message.id,{});
 if(message.method==='tools/list')return void send(message.id,{tools:[{name:'query_snapshot',description:`Read-only ${dashboardProject()} account reports from cache. Only connected sources: ${PROJECT_SOURCES[dashboardProject()].join(',')}. Backend fetches missing data before this tool runs. Sources/metrics: ${JSON.stringify(METRICS)}. Groups overview/day/channel; campaign supported by Google and EDM. Default last fully completed Tue–Mon period: ${JSON.stringify(defaultDashboardRange())}. Results include PoP and YoY baselines and server-computed *_pop/*_yoy percentage changes. Missing values are null, never zero. paid_media overview aggregates available-channel spend/traffic only; channel returns per-platform attribution. Never sum attributed revenue/orders across platforms. Account-local timezones; current period provisional. No file paths, SQL or network access.`,annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false},inputSchema:{type:'object',additionalProperties:false,properties:{source:{type:'string',enum:SOURCES.filter(s=>PROJECT_SOURCES[dashboardProject()].includes(s))},groupBy:{type:'string',enum:['overview','day','campaign','channel']},start:{type:'string',description:SNAPSHOT_RANGE.start},end:{type:'string',description:SNAPSHOT_RANGE.end}},required:['source','groupBy','start','end']}},...dashboardProject()==='bluevua'?[testingTool]:[]]});
 if(message.method==='tools/call'){
  try{if(++calls>32)throw Error('Query budget exhausted.');
   if(message.params?.name==='query_content_testing'){
    if(dashboardProject()!=='bluevua'||!process.env.AI_DASHBOARD_CONTENT_TESTING_FILE)throw Error('Content Testing data is not attached. Ask explicitly about Bluevua Content Testing so its page data can be loaded.');
    const snapshot=JSON.parse(await readFile(process.env.AI_DASHBOARD_CONTENT_TESTING_FILE,'utf8')) as ContentTestingSnapshot;
    if(snapshot.project!=='bluevua'||snapshot.sourcePage!=='/bluevua/testing')throw Error('Invalid Content Testing scope.');
    const result=contentTestingQuery(snapshot,message.params.arguments||{});await appendFile(audit+'.content-testing',JSON.stringify({sourcePage:snapshot.sourcePage,range:snapshot.range,filter:message.params.arguments||{}})+'\n',{mode:0o600});
    return void send(message.id,{content:[{type:'text',text:JSON.stringify(result)}]});
   }
   if(message.params?.name!=='query_snapshot')throw Error('Unknown tool.');if(process.env.AI_DASHBOARD_CONTENT_TESTING_FILE)throw Error('This request is scoped to Content Testing. Use query_content_testing; whole-account reports are not permitted for this analysis.');const query=validateQuery(message.params.arguments);const result=await querySnapshot(query);await appendFile(audit,JSON.stringify(query)+'\n',{mode:0o600});return void send(message.id,{content:[{type:'text',text:JSON.stringify(result)}]});}
  catch(error){return void send(message.id,{isError:true,content:[{type:'text',text:error instanceof Error?error.message:'Query failed.'}]});}
 }
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32601,message:'Method not found'}})+'\n');
 }catch{if(message?.id!==undefined)process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,error:{code:-32700,message:'Invalid request'}})+'\n');}
});
