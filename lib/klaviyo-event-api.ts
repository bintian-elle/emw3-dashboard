import "server-only";
// Metric Aggregates permits 3 requests/second and 60/minute per account.
// Share one conservative queue across EDM event and recipient reports.
declare global {var emw3KlaviyoEventQueue:{tail:Promise<void>;nextAt:number}|undefined;}
const queue=globalThis.emw3KlaviyoEventQueue??={tail:Promise.resolve(),nextAt:0};
export async function fetchKlaviyoEventReport(url:string,options:RequestInit):Promise<Response>{
 const request=queue.tail.then(async()=>{
  for(let attempt=0;attempt<3;attempt++){
   const delay=Math.max(0,queue.nextAt-Date.now());if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
   queue.nextAt=Date.now()+1100;
   const response=await fetch(url,{...options,signal:AbortSignal.timeout(30000)});
   if(response.status!==429||attempt===2)return response;
   const header=response.headers.get("retry-after");const numeric=Number(header);const wait=header&&Number.isFinite(numeric)?numeric*1000:header?Date.parse(header)-Date.now():2000*(attempt+1);
   queue.nextAt=Math.max(queue.nextAt,Date.now()+Math.max(1100,Math.min(30000,Number.isFinite(wait)?wait:2000)));
   await response.body?.cancel();
  }
  throw Error("Klaviyo rate limit retry exhausted");
 });
 queue.tail=request.then(()=>{},()=>{});return request;
}
