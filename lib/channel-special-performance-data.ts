type EdmMetricTest={hasData:boolean;delivered:number;openRate:number|null;clicks:number|null;orders:number;revenue:number};
export type EdmSpecialMetrics={delivered:number|null;openRate:number|null;clickRate:number|null;orders:number|null;revenue:number|null};
type SocialMetricName='views'|'likes'|'comments'|'shares'|'saved';
type SocialMetricPost={metrics:Record<SocialMetricName,number|null>};
export type SocialSpecialMetrics=Record<SocialMetricName,number|null>;
const valid=(value:number|null|undefined):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0;
const sum=(values:readonly number[])=>values.reduce((total,value)=>total+value,0);

/** Sum selected variations; a missing numerator does not become zero. */
export function edmSpecialMetrics(tests:readonly EdmMetricTest[]):EdmSpecialMetrics{
 const complete=tests.length>0&&tests.every(test=>test.hasData);
 const total=(key:'delivered'|'orders'|'revenue')=>complete&&tests.every(test=>valid(test[key]))?sum(tests.map(test=>test[key])):null;
 const delivered=total('delivered'),orders=total('orders'),revenue=total('revenue');
 const positive=tests.filter(test=>test.delivered>0);
 const openRate=delivered!=null&&delivered>0&&positive.every(test=>valid(test.openRate))?sum(positive.map(test=>test.openRate!*test.delivered))/delivered:null;
 const clicks=complete&&tests.every(test=>valid(test.clicks))?sum(tests.map(test=>test.clicks!)):null;
 const clickRate=delivered!=null&&delivered>0&&clicks!=null?clicks/delivered:null;
 return {delivered,openRate,clickRate,orders,revenue};
}

/** Social totals are sums of post-level organic metrics, not unique people. */
export function socialSpecialMetrics(posts:readonly SocialMetricPost[]):SocialSpecialMetrics{
 const total=(key:SocialMetricName)=>posts.length>0&&posts.every(post=>valid(post.metrics[key]))?sum(posts.map(post=>post.metrics[key]!)):null;
 return {views:total('views'),likes:total('likes'),comments:total('comments'),shares:total('shares'),saved:total('saved')};
}
