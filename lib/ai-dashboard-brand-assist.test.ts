import test from 'node:test';
import assert from 'node:assert/strict';
import {consultBrandAssistant,wantsBrandAssistance,BRAND_ASSISTANTS,type BrandAssistantRun} from './ai-dashboard-brand-assist.ts';
test('routes analytical intents only',()=>{for(const p of ['summarize performance','why did revenue drop?','战略建议','添加洞察摘要'])assert.ok(wantsBrandAssistance(p));for(const p of ['change title color','delete widget','what is revenue?','把标题改成蓝色','Rename summary to Weekly overview','Change summary title','Delete insight card'])assert.equal(wantsBrandAssistance(p),false);});
test('fixed brand map and rejection',async()=>{assert.equal(BRAND_ASSISTANTS.ringconn.assistant,'AI-ringconn');let called=false;const result=await consultBrandAssistant({project:'../bluevua',prompt:'why?',metrics:{}},{runner:async()=>{called=true;return '';}});assert.equal(result.status,'unavailable');assert.equal(called,false);});
test('runner receives isolated fixed context paths and no caller path',async()=>{let request:BrandAssistantRun|undefined;const result=await consultBrandAssistant({project:'biceek',prompt:'why did this change?',metrics:{revenue:12}},{mode:'anc',readContext:async p=>{assert.ok(p.startsWith('/home/ubuntu/work/emw3-anc/biceek/'));assert.ok(!p.includes('.local'));return 'business background';},runner:async r=>{request=r;return JSON.stringify({notes:['Background only'],sources:['README.md']});}});assert.equal(result.status,'available');assert.ok(request);assert.equal(request.assistant,'AI-Biceek');assert.equal(request.timeoutMs,0);assert.match(request.prompt,/12/);assert.ok(request.args.includes('--ephemeral'));assert.ok(request.args.includes('--ignore-user-config'));assert.ok(request.args.includes('read-only'));assert.ok(request.args.includes('service_tier="priority"'));assert.ok(request.args.includes('model="gpt-6.2-sol"'));assert.ok(request.args.includes('model_reasoning_effort="xhigh"'));assert.ok(!request.args.some((a:string)=>a.includes('mcp_servers.')));});
test('an explicitly injected test deadline never throws',async()=>{const result=await consultBrandAssistant({project:'bluevua',prompt:'summarize',metrics:{}},{readContext:async()=> 'background',timeoutMs:5,runner:async()=>new Promise(()=>{})});assert.equal(result.status,'unavailable');});

test('normal Builder consultations have no elapsed-time cutoff',async()=>{const result=await consultBrandAssistant({project:'ringconn',prompt:'summarize',metrics:{}},{readContext:async()=> 'background',runner:async request=>{assert.equal(request.timeoutMs,0);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(request.signal.aborted,false);return JSON.stringify({notes:['Brand context'],sources:['README.md']});}});assert.equal(result.status,'available');});

test('Biceek market questions exclude Content Testing and private brand documents', async () => {
 const result=await consultBrandAssistant({project:'biceek',scope:'market-overview',prompt:'Interpret market performance.',metrics:{comparison:{rows:[1]}},contentTesting:{unexpected:true}},{
  readContext:async()=>{assert.fail('The market assistant must not read brand documents.');},
  runner:async request=>{
   assert.doesNotMatch(request.prompt,/content.testing|unexpected|untrusted_business_background/i);
   assert.match(request.prompt,/Shopify/);
   assert.match(request.prompt,/"comparison":\{"rows":\[1\]\}/);
   return '{"notes":["market answer"],"sources":[]}';
  },
 });
 assert.equal(result.status,'available');
 assert.deepEqual(result.notes,['market answer']);
});
