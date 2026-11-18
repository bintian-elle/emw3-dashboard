import test from 'node:test';import assert from 'node:assert/strict';
import {KlaviyoReader} from './api.mjs';
test('read-only collector rejects foreign pagination and write endpoints',async()=>{
 const api=new KlaviyoReader({key:'test',accountId:'account',fetcher:async()=>{throw Error('unexpected request');}});
 await assert.rejects(()=>api.request('https://other.example/api/metrics/'),/endpoint/);
 await assert.rejects(()=>api.request('/api/profile-subscription-bulk-create-jobs/',{}),/endpoint/);
});
test('pagination preserves POST report bodies and rejects a repeated cursor',async()=>{
 const calls=[];const api=new KlaviyoReader({key:'test',accountId:'account',sleep:async()=>{},fetcher:async(url,options)=>{calls.push([url,JSON.parse(options.body)]);return new Response(JSON.stringify({data:{attributes:{results:[{id:calls.length}]}},links:{next:'https://a.klaviyo.com/api/flow-series-reports/?page_cursor=again'}}),{status:200});}});
 await assert.rejects(()=>api.pages('/api/flow-series-reports/',{data:{type:'flow-series-report'}}),/pagination/);assert.equal(calls.length,2);assert.deepEqual(calls[1][1],calls[0][1]);
});
test('authentication failure is bounded and excludes response secrets',async()=>{
 const api=new KlaviyoReader({key:'SECRET',accountId:'account',fetcher:async()=>new Response('SECRET',{status:401})});
 await assert.rejects(()=>api.request('/api/accounts/'),e=>e.message.includes('401')&&!e.message.includes('SECRET'));
});
test('collector keeps the existing warehouse API revision and rejects identity mismatches',async()=>{
 let revision;const api=new KlaviyoReader({key:'test',accountId:'expected',fetcher:async(url,options)=>{revision=options.headers.revision;return new Response(JSON.stringify({data:[{id:'other',attributes:{timezone:'US/Eastern'}}]}),{status:200});}});await assert.rejects(()=>api.verify(),/account mismatch/);assert.equal(revision,'2026-07-15');
});
test('nested report pagination is followed and metric cursors are sent in the POST body',async()=>{
 const calls=[];const api=new KlaviyoReader({key:'test',accountId:'account',sleep:async()=>{},fetcher:async(url,options)=>{calls.push(JSON.parse(options.body));return new Response(JSON.stringify({data:{attributes:{data:[]},links:{next:calls.length===1?'https://a.klaviyo.com/api/metric-aggregates/?page_cursor=next':null}}}),{status:200});}});
 const p=await api.pages('/api/metric-aggregates/',{data:{type:'metric-aggregate',attributes:{metric_id:'m'}}});assert.equal(p.length,2);assert.equal(calls[1].data.attributes.page_cursor,'next');assert.equal(calls[0].data.attributes.page_cursor,undefined);
});
