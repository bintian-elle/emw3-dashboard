const origin='https://a.klaviyo.com';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
/** Sequential, account-bound read operations; reporting POSTs never change marketing data. */
export class KlaviyoReader{
 constructor({key=process.env.KLAVIYO_API_KEY,accountId=process.env.EDM_KLAVIYO_ACCOUNT_ID,fetcher=fetch,sleep=pause}={}){
  if(!key||!accountId)throw Error('EDM Klaviyo credentials or account binding missing');
  this.key=key;this.accountId=accountId;this.fetcher=fetcher;this.sleep=sleep;this.next=0;this.reportNext=0;
 }
 async request(path,body){
  const url=new URL(path,origin);if(!url.pathname.endsWith('/'))url.pathname+='/';const report=/reports\/$/.test(url.pathname),aggregate=url.pathname==='/api/metric-aggregates/';
  const allowed=body?report&&/^\/api\/(?:campaign-values|flow-values|flow-series|segment-series)-reports\/$/.test(url.pathname)||aggregate:/^\/api\/(?:accounts|metrics|campaigns|campaign-messages|flows|flow-messages|templates|segments)(?:\/[A-Za-z0-9_-]+(?:\/(?:flow-messages|template))?)?\/$/.test(url.pathname);
  if(url.origin!==origin||url.username||url.password||!allowed)throw Error('Disallowed Klaviyo read endpoint');
  for(let attempt=0;attempt<4;attempt++){
   const wait=Math.max(0,this.next-Date.now(),report?this.reportNext-Date.now():0);if(wait)await this.sleep(wait);
   this.next=Date.now()+1100;if(report)this.reportNext=Date.now()+31000;
   let response;
   // Match the warehouse's established campaign/message identifiers, before the omnichannel API change.
   try{response=await this.fetcher(url.href,{method:body?'POST':'GET',headers:{Authorization:`Klaviyo-API-Key ${this.key}`,revision:'2026-07-15',accept:'application/vnd.api+json','Content-Type':'application/vnd.api+json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000),redirect:'error',cache:'no-store'});}catch{if(attempt===3)throw Error('Klaviyo network or request timeout');await this.sleep(2000*2**attempt);continue;}
   if(response.ok){const result=await response.json();if(!result||typeof result!=='object'||!result.data)throw Error('Invalid Klaviyo response');return result;}
   const status=response.status,header=response.headers.get('retry-after');await response.body?.cancel();
   if((status===429||status>=500)&&attempt<3){const delay=header&&/^\d+(\.\d+)?$/.test(header)?Number(header)*1000:2000*2**attempt;if(delay>120000)throw Error(`Klaviyo HTTP ${status}: retry deferred to scheduled retry`);await this.sleep(Math.max(1100,delay));continue;}
   throw Error(`Klaviyo HTTP ${status}`);
  }
 }
 async verify(){const r=await this.request('/api/accounts/');if(!Array.isArray(r.data)||r.data.length!==1||r.data[0].id!==this.accountId)throw Error('Klaviyo account mismatch');const zone=r.data[0].attributes?.timezone;if(!['US/Eastern','America/New_York'].includes(zone))throw Error('Unexpected EDM account timezone');return r.data[0];}
 async pages(path,body){
  let next=path,requestBody=body;const pages=[],seen=new Set(),base=new URL(path,origin),pathname=base.pathname.replace(/\/$/,'');
  while(next){const current=new URL(next,origin),normalized=current.href;if(current.origin!==origin||current.pathname.replace(/\/$/,'')!==pathname||seen.has(normalized)||pages.length>=200)throw Error('Incomplete or foreign Klaviyo pagination');seen.add(normalized);
   let requestPath=next;
   if(body&&pathname==='/api/metric-aggregates'&&pages.length){const cursor=current.searchParams.get('page_cursor')??current.searchParams.get('page[cursor]');if(!cursor)throw Error('Missing aggregate pagination cursor');requestBody=structuredClone(body);requestBody.data.attributes.page_cursor=cursor;requestPath=base.href;}
   const page=await this.request(requestPath,requestBody);pages.push(page);next=page.links?.next??page.data?.links?.next??null;if(next&&typeof next!=='string')throw Error('Invalid Klaviyo pagination');
  }
  return pages;
 }
 async list(path){const pages=await this.pages(path);if(pages.some(p=>!Array.isArray(p.data)))throw Error('Invalid Klaviyo list');return pages.flatMap(p=>p.data);}
}
