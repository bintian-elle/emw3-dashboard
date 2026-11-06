export function generationOriginAllowed(requestUrl:string,origin:string|null,configuredOrigin:string,localPreview:boolean){
 const url=new URL(requestUrl);
 if(localPreview&&['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&['http:','https:'].includes(url.protocol))return origin===url.origin;
 return origin===configuredOrigin;
}
export function scheduledGenerationAllowed(requestUrl:string,authorization:string|null,secret:string|undefined,environment:string|undefined){
 const url=new URL(requestUrl);
 return environment==='production'&&url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&Boolean(secret?.trim())&&authorization===`Bearer ${secret!.trim()}`;
}
