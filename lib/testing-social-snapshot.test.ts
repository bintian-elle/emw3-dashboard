import {test} from 'node:test';
import assert from 'node:assert/strict';
import {isCompleteSocialSnapshot,isSocialSnapshot,socialDisplayTimestamp} from './testing-social-snapshot.ts';
import {instagramPostCodes,socialMetrics} from './instagram-posts.ts';

const local={version:2,capturedAt:'2026-10-28T18:11:20.017Z',posts:[{id:'post'}]};
const shared={version:2,capturedAt:'2026-10-28T18:15:00.000Z',posts:[{id:'post'}]};

test('a valid shared snapshot takes precedence even if a local file exists',()=>{
 assert.equal(socialDisplayTimestamp(shared,'2026-10-28T18:16:07.616Z',local),'2026-10-28T18:16:07.616Z');
});
test('without a usable shared snapshot, report the actual local snapshot capture time',()=>{
 assert.equal(socialDisplayTimestamp(null,null,local),'2026-10-28T18:11:20.017Z');
 assert.equal(socialDisplayTimestamp({version:1,posts:[{}]},'2026-10-28T19:00:00.000Z',local),'2026-10-28T18:11:20.017Z');
 assert.equal(isSocialSnapshot({version:2,posts:[]}),false);
});
test('unknown or malformed timestamps never fabricate a time or use a different snapshot',()=>{
 assert.equal(socialDisplayTimestamp(null,null,{...local,capturedAt:'invalid'}),null);
 assert.equal(socialDisplayTimestamp(shared,'invalid',local),null);
 assert.equal(socialDisplayTimestamp(null,null,null),null);
});
test('scheduled skip requires all configured posts and complete paid coverage',()=>{
 const metrics=Object.fromEntries(socialMetrics.map(key=>[key,key==='follows'?null:1]));
 const posts=instagramPostCodes.map(code=>({code,status:'partial',metrics,paid:{status:'available',metrics}}));
 assert.equal(isCompleteSocialSnapshot({version:2,posts}),true);
 assert.equal(isCompleteSocialSnapshot({version:2,posts:posts.slice(0,-1)}),false);
 assert.equal(isCompleteSocialSnapshot({version:2,posts:[...posts.slice(0,-1),posts[0]]}),false);
 assert.equal(isCompleteSocialSnapshot({version:2,posts:posts.map((post,index)=>index?post:{...post,status:'unavailable'})}),false);
 assert.equal(isCompleteSocialSnapshot({version:2,posts:posts.map((post,index)=>index?post:{...post,paid:undefined})}),false);
 assert.equal(isCompleteSocialSnapshot({version:2,posts:posts.map((post,index)=>index?post:{...post,metrics:{views:1}})}),false);
 assert.equal(isCompleteSocialSnapshot({version:2,posts:posts.map((post,index)=>index?post:{...post,metrics:{...metrics,views:'1'}})}),false);
 assert.equal(isCompleteSocialSnapshot({version:2,posts:posts.map((post,index)=>index?post:{...post,code:'unexpected'})}),false);
});
