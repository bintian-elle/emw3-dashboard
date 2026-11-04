export function stagingRequestAllowed(method:string,path:string){
 if(/\/(?:refresh|data-refresh|social-refresh)$/.test(path))return false;
 if(method==='GET'||method==='HEAD')return true;
 if(path==='/api/staging/notes')return method==='POST'||method==='PATCH';
 if(path==='/api/account/preferences')return method==='PATCH';
 return method==='POST'&&['/api/auth/logout','/api/auth/login','/api/klaviyo/dashboard','/api/klaviyo/yoy','/api/klaviyo/creative','/api/klaviyo/previews'].includes(path);
}
