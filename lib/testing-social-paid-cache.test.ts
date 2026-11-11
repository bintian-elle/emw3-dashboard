import test from 'node:test';
import assert from 'node:assert/strict';
import {readOrFetchSocialPaid,type PaidCacheQuery} from './testing-social-paid-cache.ts';

const range={start:'2026-10-01',end:'2026-10-31'},scope='v1:test:2026-10-01:2026-10-31',codes=['post-a'];
const posts=[{code:'post-a',paid:{status:'available' as const,adCount:1,metrics:{views:20,reach:10,likes:0,comments:0,shares:0,saved:0,follows:null}}}];
function fakeDb(options:{cached?:unknown;version?:string|null}={}){
 const calls:string[]=[],writes:unknown[]=[];let cached=options.cached;
 const query:PaidCacheQuery=async(sql,values)=>{calls.push(sql);
  if(sql.includes('social-paid-period')&&sql.includes('select'))return {rows:[{payload:cached??null,source_version:options.version??null}]};
  if(sql.startsWith('insert')){cached=JSON.parse(values![2] as string);writes.push(cached);return {rows:[]};}
  return {rows:[]};
 };
 return {query,calls,writes};
}
const valid=(sourceVersion:string|null=null)=>({version:1,...range,sourceVersion,posts});

test('an exact matching saved period is returned without calling Meta',async()=>{
 const db=fakeDb({cached:valid('2026-11-01T00:00:00.000Z'),version:'2026-11-01T00:00:00.000Z'});let calls=0;
 const result=await readOrFetchSocialPaid(db.query,scope,range,codes,async()=>{calls++;return posts;});
 assert.equal(calls,0);assert.deepEqual(result.posts,posts);assert.equal(result.stale,false);assert.equal(db.writes.length,0);
});

test('a cache miss fetches once and writes only complete period data',async()=>{
 const db=fakeDb({version:'2026-11-01T00:00:00.000Z'});let calls=0;
 const result=await readOrFetchSocialPaid(db.query,scope,range,codes,async()=>{calls++;return posts;});
 assert.equal(calls,1);assert.deepEqual(result.posts,posts);assert.equal(db.writes.length,1);assert.deepEqual(db.writes[0],valid('2026-11-01T00:00:00.000Z'));assert.equal(db.calls.at(-1),'commit');
});

test('failed refresh keeps stale cached data and communicates API limits',async()=>{
 const db=fakeDb({cached:valid('2026-10-31T00:00:00.000Z'),version:'2026-11-01T00:00:00.000Z'});
 const result=await readOrFetchSocialPaid(db.query,scope,range,codes,async()=>{throw Error('API rate limit (HTTP 429)');});
 assert.deepEqual(result.posts,posts);assert.equal(result.stale,true);assert.equal(result.limited,true);assert.equal(db.writes.length,0);assert.equal(db.calls.at(-1),'rollback');
});

test('a failed or incomplete first fetch cannot create a cache',async()=>{
 for(const load of [async()=>{throw Error('HTTP 429')},async()=>[]]){
  const db=fakeDb();await assert.rejects(()=>readOrFetchSocialPaid(db.query,scope,range,codes,load));assert.equal(db.writes.length,0);assert.equal(db.calls.at(-1),'rollback');
 }
});

test('a cache for a different interval or incomplete post set is not reused',async()=>{
 for(const cached of [{...valid(),start:'2026-09-01'}, {...valid(),posts:[]}]){
  const db=fakeDb({cached});let count=0;await readOrFetchSocialPaid(db.query,scope,range,codes,async()=>{count++;return posts;});assert.equal(count,1);
 }
});

test('a second request reuses a result published while it was waiting for the shared lock',async()=>{
 let reads=0,loads=0;const calls:string[]=[];
 const query:PaidCacheQuery=async sql=>{calls.push(sql);if(sql.includes('social-paid-period')&&sql.includes('select'))return {rows:[{payload:++reads===1?null:valid(),source_version:null}]};return {rows:[]};};
 const result=await readOrFetchSocialPaid(query,scope,range,codes,async()=>{loads++;return posts;});
 assert.equal(loads,0);assert.deepEqual(result.posts,posts);assert.equal(calls.some(sql=>sql.startsWith('insert')),false);assert.equal(calls.at(-1),'commit');
});

test('a database write failure rolls back and returns the previous snapshot',async()=>{
 const calls:string[]=[],cached=valid('2026-10-31T00:00:00.000Z');
 const query:PaidCacheQuery=async sql=>{calls.push(sql);if(sql.includes('social-paid-period')&&sql.includes('select'))return {rows:[{payload:cached,source_version:'2026-11-01T00:00:00.000Z'}]};if(sql.startsWith('insert'))throw Error('database unavailable');return {rows:[]};};
 const result=await readOrFetchSocialPaid(query,scope,range,codes,async()=>posts);
 assert.deepEqual(result.posts,posts);assert.equal(result.stale,true);assert.equal(calls.at(-1),'rollback');
});
