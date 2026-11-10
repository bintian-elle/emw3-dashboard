const reviewers=new Set(['bintian.feng@elle-media.com','ivan.he@elle-media.com','fiona.deng@elle-media.com']);
type ReviewUser={email:string}|null|undefined;

/** Review features are available only to the original signed-in reviewers. */
export function canAccessReviewTools(user:ReviewUser){
 return !!user&&reviewers.has(user.email.trim().toLowerCase());
}
export function canWriteReviewTools(user:ReviewUser,origin:string|null,expectedOrigin:string){
 return canAccessReviewTools(user)&&origin!==null&&origin===expectedOrigin;
}
export function reviewExpectedOrigin(requestUrl:string,configuredOrigin:string,localPreview:boolean){
 const url=new URL(requestUrl);
 return localPreview&&url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)?url.origin:configuredOrigin;
}
export function reviewPreviewEnabled(user:ReviewUser,cookie:string|undefined){return canAccessReviewTools(user)&&cookie==='1';}
export function reviewPreviewRequestAllowed(method:string,path:string){
 if(path==='/api/klaviyo/insights/refresh')return false;
 return !(method!=='GET'&&method!=='HEAD'&&['/api/testing/data-refresh','/api/testing/social-refresh','/api/testing/readouts/refresh','/api/testing/history/generate'].includes(path));
}
