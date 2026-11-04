import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {isStagingReviewer,createStagingTicket,consumeStagingTicket} from './staging-access.ts';
const user={sub:'google-123',name:'Fiona Deng',email:'fiona.deng@elle-media.com'};
const config={secret:'x'.repeat(48),emails:'bintian.feng@elle-media.com,fiona.deng@elle-media.com,ivan.he@elle-media.com'};
test('only configured exact emails qualify; empty configuration fails closed',()=>{
 assert.equal(isStagingReviewer(user.email,config.emails),true);assert.equal(isStagingReviewer('evil-fiona.deng@elle-media.com',config.emails),false);assert.equal(isStagingReviewer(user.email,''),false);
});
test('handoff binds browser nonce, preserves trusted Google identity and is single use',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'staging-handoff-'));
 try{const ticket=await createStagingTicket(user,'a'.repeat(48),'/bluevua/testing',config);
 await assert.rejects(consumeStagingTicket(ticket,'b'.repeat(48),dir,config));
 const result=await consumeStagingTicket(ticket,'a'.repeat(48),dir,config);assert.deepEqual(result.user,user);assert.equal(result.returnTo,'/bluevua/testing');
 await assert.rejects(consumeStagingTicket(ticket,'a'.repeat(48),dir,config));
 await assert.rejects(createStagingTicket({...user,email:'other@elle-media.com'},'a'.repeat(48),'/',config));
 const unsafe=await createStagingTicket(user,'c'.repeat(48),'//evil.test',config);assert.equal((await consumeStagingTicket(unsafe,'c'.repeat(48),dir,config)).returnTo,'/');
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('tampered, expired and wrong-audience tickets fail before a receipt is written',async()=>{
 const {SignJWT}=await import('jose');const dir=await mkdtemp(join(tmpdir(),'staging-handoff-invalid-'));const nonce='d'.repeat(48);
 try{
 const good=await createStagingTicket(user,nonce,'/',config);
 await assert.rejects(consumeStagingTicket(good.slice(0,-8)+'aaaaaaaa',nonce,dir,config));
 for(const audience of ['staging-login','other']){
 const ticket=await new SignJWT({user,nonce,returnTo:'/'}).setProtectedHeader({alg:'HS256'}).setIssuer('https://emw3-dashboard.win').setAudience(audience).setJti('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa').setIssuedAt(Math.floor(Date.now()/1000)-120).setExpirationTime(Math.floor(Date.now()/1000)-60).sign(new TextEncoder().encode(config.secret));
 await assert.rejects(consumeStagingTicket(ticket,nonce,dir,config));
 }
 }finally{await rm(dir,{recursive:true,force:true});}
});
