import {jwtVerify} from "jose";
export const CODEX_SITE_COOKIE="emw3_codex_read";
export const CODEX_SITE_AUDIENCE="dashboard-read-only";
const readPostPaths=new Set(["/api/klaviyo/dashboard","/api/klaviyo/yoy","/api/klaviyo/creative","/api/klaviyo/previews"]);
export function codexReadPath(method:string,pathname:string){
 if(method==="POST")return readPostPaths.has(pathname);
 if(method!=="GET"&&method!=="HEAD")return false;
 return pathname==="/"||pathname==="/bluevua"||pathname.startsWith("/bluevua/")||pathname==="/api/google-ads/overview"||pathname.startsWith("/api/google/creative-media/");
}
export async function validCodexSiteToken(token:string|undefined){
 const key=process.env.CODEX_SITE_ACCESS_SECRET?.trim();if(!token||!key||key.length<32)return false;
 try{const {payload}=await jwtVerify(token,new TextEncoder().encode(key),{algorithms:["HS256"],issuer:"bluevua-cloud-codex",audience:CODEX_SITE_AUDIENCE});return payload.sub==="bluevua-cloud-codex"&&payload.scope==="dashboard:read"&&typeof payload.iat==="number"&&typeof payload.exp==="number"&&payload.exp-payload.iat<=900;}catch{return false;}
}
