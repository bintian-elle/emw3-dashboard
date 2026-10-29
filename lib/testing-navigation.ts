const testingRoot="/bluevua/testing";
export function safeTestingReturnTo(value:string|undefined|null,fallback:string){
 if(typeof value!=="string"||!(value===testingRoot||value.startsWith(`${testingRoot}?`)||value.startsWith(`${testingRoot}#`)||value.startsWith(`${testingRoot}/`))||/[\\\u0000-\u001f]/.test(value))return fallback;
 try{const url=new URL(value,"https://dashboard.local");if(url.origin!=="https://dashboard.local")return fallback;return `${url.pathname}${url.search}${url.hash}`;}catch{return fallback;}
}
export function withTestingReturnTo(href:string,parent:string){
 const url=new URL(href,"https://dashboard.local");url.searchParams.set("returnTo",parent);return `${url.pathname}${url.search}`;
}
/** Remove a reporting period from a testing URL and its nested return paths. */
export function clearTestingPeriod(href:string,depth=0):string{
 const safe=safeTestingReturnTo(href,"");
 if(!safe)return href;
 const url=new URL(safe,"https://dashboard.local");
 let changed=false;
 for(const key of ["period","start","end"]){if(url.searchParams.has(key)){url.searchParams.delete(key);changed=true;}}
 const parent=url.searchParams.get("returnTo");
 if(parent&&depth<5){const cleared=clearTestingPeriod(parent,depth+1);if(cleared!==parent){url.searchParams.set("returnTo",cleared);changed=true;}}
 return changed?`${url.pathname}${url.search}${url.hash}`:href;
}

/** Reset ordinary document loads before the page can fetch the old period.
 * Shared links explicitly opt in to their saved range for the initial load. */
export function testingDocumentPeriodRedirect(href:string,method:string,headers:Pick<Headers,"get">):string|null{
 const safe=safeTestingReturnTo(href,"");
 if(!safe||method!=="GET")return null;
 const url=new URL(safe,"https://dashboard.local");
 const mode=headers.get("sec-fetch-mode"),destination=headers.get("sec-fetch-dest");
 const documentRequest=mode==="navigate"&&(destination==="document"||destination==="iframe");
 // Older browsers omit Fetch Metadata. In this Next version client RSC fetches
 // use the fetch default */*, while browser document requests accept HTML.
 const legacyDocument=!mode&&!destination&&!url.searchParams.has("_rsc")&&(headers.get("accept")??"").toLowerCase().includes("text/html");
 if(!documentRequest&&!legacyDocument)return null;
 if(url.searchParams.get("shared")==="1")return null;
 const cleared=clearTestingPeriod(safe);
 return cleared===safe?null:cleared;
}
type TestingPeriodQuery={period?:string|string[];start?:string|string[];end?:string|string[]};
export function testingCampaignAnchor(channel:string,name:string){return `campaign:${channel}:${name}`;}
export function testingCampaignHref(parent:string,channel:string,name:string,query?:TestingPeriodQuery){
 const url=new URL(safeTestingReturnTo(parent,testingRoot),"https://dashboard.local");
 const first=(value:string|string[]|undefined)=>Array.isArray(value)?value[0]:value;
 const period=first(query?.period);
 if(period){
  url.searchParams.set("period",period);
  for(const key of ["start","end"] as const){const value=first(query?.[key]);if(period==="custom"&&value)url.searchParams.set(key,value);else url.searchParams.delete(key);}
 }
 url.hash=encodeURIComponent(testingCampaignAnchor(channel,name));
 return `${url.pathname}${url.search}${url.hash}`;
}
export function isConcludedTestingNavigation(pathname:string,returnTo?:string|null,depth=0):boolean{
 if(pathname.startsWith(`${testingRoot}/concluded`))return true;
 const arm=pathname.startsWith(`${testingRoot}/google/concluded/`);
 const detail=pathname.startsWith(`${testingRoot}/google/search/`);
 if((arm||detail)&&returnTo&&depth<5){const safe=safeTestingReturnTo(returnTo,"");if(safe){const parent=new URL(safe,"https://dashboard.local");return isConcludedTestingNavigation(parent.pathname,parent.searchParams.get("returnTo"),depth+1);}}
 return arm;
}
