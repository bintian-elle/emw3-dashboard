/** Build a shareable Testing URL from the page's applied reporting range. */
export function testingShareHref(href:string,scopeRange?:{start:string;end:string}|null,pageRange?:{start:string;end:string}|null){
 const url=new URL(href);
 // A page-wide reporting period takes precedence over a campaign scope,
 // which may be clipped to a concluded test's lifetime.
 const range=pageRange??scopeRange;
 if(range){url.searchParams.set('period','custom');url.searchParams.set('start',range.start);url.searchParams.set('end',range.end);}
 url.searchParams.set('shared','1');
 return url.toString();
}
