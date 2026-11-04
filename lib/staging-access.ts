import {SignJWT,jwtVerify} from 'jose';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,readdir,unlink,stat} from 'node:fs/promises';
import {join} from 'node:path';
import type {SiteUser} from './site-auth.ts';
type Config={secret:string;emails:string};
export const STAGING_ORIGIN='https://staging.emw3-dashboard.win';
export const PRODUCTION_ORIGIN='https://emw3-dashboard.win';
export {isStagingReviewer} from './staging-review-policy.ts';
import {isStagingReviewer} from './staging-review-policy.ts';
function config():Config{return {secret:process.env.STAGING_HANDOFF_SECRET||'',emails:process.env.STAGING_REVIEW_EMAILS||''};}
function key(settings:Config){if(settings.secret.length<32)throw Error('Staging handoff is not configured');return new TextEncoder().encode(settings.secret);}
import {safeStagingPage as safePage} from './staging-navigation.ts';
export async function createStagingTicket(user:SiteUser,nonce:string,returnTo:string,settings=config()){
 if(!isStagingReviewer(user.email,settings.emails)||!/^[-\w]{32,128}$/.test(nonce))throw Error('Staging access denied');
 return new SignJWT({user,nonce,returnTo:safePage(returnTo)}).setProtectedHeader({alg:'HS256'}).setIssuer(PRODUCTION_ORIGIN).setAudience('staging-login').setJti(randomUUID()).setIssuedAt().setExpirationTime('60s').sign(key(settings));
}
export async function consumeStagingTicket(ticket:string,nonce:string,dir:string,settings=config()){
 const {payload}=await jwtVerify(ticket,key(settings),{algorithms:['HS256'],issuer:PRODUCTION_ORIGIN,audience:'staging-login',maxTokenAge:'60s'});
 const user=payload.user as SiteUser|undefined;
 if(!user||typeof user.sub!=='string'||typeof user.name!=='string'||typeof user.email!=='string'||!isStagingReviewer(user.email,settings.emails)||payload.nonce!==nonce||!/^[-\w]{32,128}$/.test(nonce)||typeof payload.jti!=='string'||!/^[0-9a-f-]{36}$/.test(payload.jti))throw Error('Invalid staging handoff');
 await mkdir(dir,{recursive:true,mode:0o700});
 // The exclusive receipt makes a ticket single use across workers/restarts.
 await writeFile(join(dir,payload.jti),String(Date.now()),{flag:'wx',mode:0o600});
 // Receipts outlive the 60-second ticket, but need not accumulate forever.
 for(const name of await readdir(dir)){if(!/^[0-9a-f-]{36}$/.test(name))continue;const path=join(dir,name);const info=await stat(path).catch(()=>null);if(info&&Date.now()-info.mtimeMs>300000)await unlink(path).catch(()=>{});}
 return {user,returnTo:safePage(payload.returnTo)};
}
