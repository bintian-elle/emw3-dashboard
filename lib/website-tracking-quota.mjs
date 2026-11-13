export const trackingQuotaLabels={
 serverErrorsPerProjectPerHour:'每项目／属性的小时服务器错误额度',
 concurrentRequests:'并发请求额度',
 tokensPerProjectPerHour:'每项目／属性的小时 Token 额度',
 tokensPerDay:'每日 Token 额度',tokensPerHour:'每小时 Token 额度',
 potentiallyThresholdedRequestsPerHour:'每小时敏感维度查询额度',
 requestsPerMinute:'每分钟请求额度',requestsPerSecond:'每秒请求额度',requestsPerDay:'每日请求额度',
};
export function sanitizeTrackingQuota(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return;
 const categories=Array.isArray(input.categories)?[...new Set(input.categories.filter(c=>typeof c==='string'&&Object.hasOwn(trackingQuotaLabels,c)))].slice(0,9):[];
 const limits=Array.isArray(input.limits)?input.limits.filter(l=>l&&typeof l.category==='string'&&Object.hasOwn(trackingQuotaLabels,l.category)&&Number.isSafeInteger(l.limit)&&l.limit>0&&l.limit<=1000000000).slice(0,8).map(l=>({category:l.category,limit:l.limit})):[];
 const metric=name=>typeof name==='string'&&/^analytics(?:data|admin)\.googleapis\.com\/[a-z_/]{1,160}$/.test(name);
 const limitName=name=>typeof name==='string'&&/^[A-Za-z_]{1,120}$/.test(name)&&/request|token|server.?error|concurrent|threshold/i.test(name);
 const metrics=Array.isArray(input.metrics)?input.metrics.filter(metric).slice(0,4):[];
 const limitNames=Array.isArray(input.limitNames)?input.limitNames.filter(limitName).slice(0,4):[];
 const namedLimits=Array.isArray(input.namedLimits)?input.namedLimits.filter(l=>l&&limitName(l.name)&&Number.isSafeInteger(l.limit)&&l.limit>0&&l.limit<=1000000000).slice(0,4).map(l=>({name:l.name,limit:l.limit})):[];
 const seconds=typeof input.retryAfterSeconds==='number'&&Number.isFinite(input.retryAfterSeconds)&&input.retryAfterSeconds>=0&&input.retryAfterSeconds<=86400?input.retryAfterSeconds:undefined;
 const date=typeof input.retryAt==='string'&&/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|\+00:00)$/.test(input.retryAt)&&Number.isFinite(Date.parse(input.retryAt))?new Date(input.retryAt).toISOString():undefined;
 const source=['retry-after','google-retry-info'].includes(input.retrySource)?input.retrySource:undefined;
 return {categories,limits,retryProvided:!!source&&(seconds!==undefined||date!==undefined),...(source?{retrySource:source}:{}),...(seconds===undefined?{}:{retryAfterSeconds:seconds}),...(date?{retryAt:date}:{}),...(metrics.length?{metrics}:{}),...(limitNames.length?{limitNames}:{}),...(namedLimits.length?{namedLimits}:{}),...(input.evidenceSaved===false?{evidenceSaved:false}:{})};
}
export function formatTrackingQuota(input){
 const quota=sanitizeTrackingQuota(input);
 const categories=quota?.categories??[];
 const label=categories.length?categories.map(key=>trackingQuotaLabels[key]).join('、'):quota?.metrics?.length||quota?.limitNames?.length?'暂未归类（见 Google 额度字段）':'Google 未明确返回';
 const limits=quota?.limits.length?'；上限 '+quota.limits.map(l=>`${trackingQuotaLabels[l.category]}=${l.limit}`).join('、'):'';
 let retry='Google 未提供重试时间';
 if(quota?.retryProvided){
  const timestamp=quota.retryAt?new Intl.DateTimeFormat('zh-CN',{timeZone:'America/New_York',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(new Date(quota.retryAt))+' 美东时间':'';
  retry=`Google 建议重试：${timestamp||`${quota.retryAfterSeconds} 秒后`}${timestamp&&quota.retryAfterSeconds!==undefined?`（返回时需等待 ${quota.retryAfterSeconds} 秒）`:''}；来源 ${quota.retrySource==='retry-after'?'Retry-After':'Google RetryInfo'}`;
 }
 const fields=[...(quota?.metrics??[]),...(quota?.limitNames??[])].slice(0,2);
 const names=fields.length?`；Google 额度字段 ${fields.join('、')}`:'';
 const named=quota?.namedLimits?.length?`；额度上限 ${quota.namedLimits.map(l=>`${l.name}=${l.limit}`).join('、')}`:'';
 return `额度：${label}${limits}${names}${named}；${retry}${quota?.evidenceSaved===false?'；额度历史写入未完成':''}`;
}
