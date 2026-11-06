export function safeStagingPage(value:unknown){return typeof value==='string'&&/^\/(?!\/)/.test(value)&&!/[\\\x00-\x1f]/.test(value)&&!/^\/(?:api|access|staging-review)(?:[/?#]|$)/.test(value)&&value.length<=2000?value:'/';}
function preservePeriod(value:string){const url=new URL(value,'https://emw3-dashboard.win');if(/^\/bluevua\/testing(?:\/|$)/.test(url.pathname)&&['period','start','end'].some(key=>url.searchParams.has(key)))url.searchParams.set('shared','1');return url.pathname+url.search+url.hash;}
export function stagingReviewHref(pathname:string,search='',hash=''){const query=search.replace(/^\?/,'');return '/staging-review?'+new URLSearchParams({returnTo:preservePeriod(safeStagingPage(pathname+(query?'?'+query:'')+hash))}).toString();}
export function stagingStartHref(page:unknown){const url=new URL('/api/auth/staging/start','https://staging.emw3-dashboard.win');url.searchParams.set('returnTo',preservePeriod(safeStagingPage(page)));return url.href;}
export function productionPageHref(pathname:string,search='',hash='',currentOrigin=''){
 const query=search.replace(/^\?/,'');let origin='https://emw3-dashboard.win';
 try{const current=new URL(currentOrigin);if(current.protocol==='http:'&&['localhost','127.0.0.1'].includes(current.hostname)&&current.port==='3000')origin=`http://${current.hostname}:3001`;}catch{/* Online staging keeps its configured production destination. */}
 return origin+preservePeriod(safeStagingPage(pathname+(query?'?'+query:'')+hash));
}
