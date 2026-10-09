const testingRoot="/bluevua/testing";
export function safeTestingReturnTo(value:string|undefined|null,fallback:string){
 if(typeof value!=="string"||!value.startsWith(`${testingRoot}/`)||/[\\\u0000-\u001f]/.test(value))return fallback;
 try{const url=new URL(value,"https://dashboard.local");if(url.origin!=="https://dashboard.local")return fallback;return `${url.pathname}${url.search}${url.hash}`;}catch{return fallback;}
}
export function withTestingReturnTo(href:string,parent:string){
 const url=new URL(href,"https://dashboard.local");url.searchParams.set("returnTo",parent);return `${url.pathname}${url.search}`;
}
export function isConcludedTestingNavigation(pathname:string,returnTo?:string|null,depth=0):boolean{
 if(pathname.startsWith(`${testingRoot}/concluded`))return true;
 const arm=pathname.startsWith(`${testingRoot}/google/concluded/`);
 const detail=pathname.startsWith(`${testingRoot}/google/search/`);
 if((arm||detail)&&returnTo&&depth<5){const safe=safeTestingReturnTo(returnTo,"");if(safe){const parent=new URL(safe,"https://dashboard.local");return isConcludedTestingNavigation(parent.pathname,parent.searchParams.get("returnTo"),depth+1);}}
 return arm;
}
