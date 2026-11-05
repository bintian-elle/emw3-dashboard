export function stagingRequestAllowed(method:string,path:string){
 if(/\/(?:refresh|data-refresh|social-refresh)$/.test(path))return false;
 if(method==='GET'||method==='HEAD')return true;
 if(path==='/api/staging/notes')return method==='POST'||method==='PATCH'||method==='DELETE';
 if(path==='/api/testing/chat')return method==='POST'||method==='DELETE';
 if(path==='/api/testing/prompts')return method==='POST';
 if(path==='/api/account/preferences')return method==='PATCH';
 return method==='POST'&&['/api/auth/logout','/api/auth/login','/api/klaviyo/dashboard','/api/klaviyo/yoy','/api/klaviyo/creative','/api/klaviyo/previews'].includes(path);
}
export function assertLiveSourceAllowed(environment=process.env.DEPLOYMENT_ENV){
 if(environment==='staging')throw Error('Live advertising requests are disabled in staging. Choose a published reporting period.');
}
