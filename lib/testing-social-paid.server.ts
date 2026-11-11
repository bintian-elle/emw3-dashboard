import 'server-only';
import {createHash} from 'node:crypto';
import {cachedInstagramPosts} from './instagram-posts';
import {fetchSocialPaidForPeriod} from './testing-social';
import {withTestingDataClient} from './testing-data-cache';
import {readOrFetchSocialPaid,type PaidCacheQuery,type PaidPeriodResult} from './testing-social-paid-cache';

const pending=new Map<string,Promise<PaidPeriodResult>>();
/** Share exact-period Paid results across users and server instances. */
export async function getSocialPaidPeriod(range:{start:string;end:string}):Promise<PaidPeriodResult>{
 const account=process.env.META_AD_ACCOUNT_ID?.replace(/^act_/,'');
 if(!account||!/^\d+$/.test(account))throw Error('Instagram ad account unavailable');
 if(cachedInstagramPosts.some(post=>!post.id||!post.publishedAt))throw Error('Instagram post identity is unavailable locally');
 const eligible=cachedInstagramPosts.filter(post=>post.publishedAt!.slice(0,10)<=range.end);
 const signature=createHash('sha256').update(JSON.stringify({account,posts:eligible.map(({code,id,publishedAt})=>({code,id,publishedAt}))})).digest('hex').slice(0,24);
 const scope=`v1:${signature}:${range.start}:${range.end}`,current=pending.get(scope);
 if(current)return current;
 const task=withTestingDataClient(client=>{
  const query:PaidCacheQuery=async(sql,values)=>{const result=await client.query(sql,values);return {rows:result.rows};};
  return readOrFetchSocialPaid(query,scope,range,eligible.map(post=>post.code),()=>fetchSocialPaidForPeriod(cachedInstagramPosts,range));
 });
 pending.set(scope,task);
 void task.finally(()=>{if(pending.get(scope)===task)pending.delete(scope);}).catch(()=>{});
 return task;
}
