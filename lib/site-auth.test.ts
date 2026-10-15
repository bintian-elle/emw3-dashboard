import test from "node:test";
import assert from "node:assert/strict";
import { authOrigin, allowedGoogleUser, safeReturnPath, signAuthPayload, readSession, verifyAuthPayload } from "./site-auth.ts";

process.env.AUTH_SECRET = "synthetic-test-secret-at-least-32-characters";
test("only verified company Workspace users are admitted", () => {
  const user = {sub:"123",email:"Member@elle-media.com",name:"Member",email_verified:true,hd:"elle-media.com"};
  assert.equal(allowedGoogleUser(user)?.email,"member@elle-media.com");
  for(const bad of [{email:"member@gmail.com"},{email:"member@elle-media.com.evil.test"},{hd:"evil.test"},{hd:undefined},{email_verified:false},{email_verified:"true"},{sub:undefined}]) assert.equal(allowedGoogleUser({...user,...bad}),null);
});
test("sessions reject tampering, wrong purpose, expiry and old key cookies",async()=>{
  const user={sub:"123",email:"member@elle-media.com",name:"Member"};
  const token=await signAuthPayload(user,"site-session",60);
  assert.deepEqual(await readSession(token),user);
  assert.equal(await readSession(token+"x"),null);
  assert.equal(await readSession(await signAuthPayload(user,"oauth-state",60)),null);
  assert.equal(await readSession(await signAuthPayload(user,"site-session",-1)),null);
  assert.equal(await readSession("legacy-key-cookie"),null);
  await assert.rejects(verifyAuthPayload(token,"oauth-state"));
});
test("return paths cannot redirect outside the site",()=>{
  for(const path of ["https://evil.test","//evil.test","/\\evil.test","/\nevil.test"])assert.equal(safeReturnPath(path),"/");
  assert.equal(safeReturnPath("/bluevua/testing/reddit?period=last7"),"/bluevua/testing/reddit?period=last7");
});

test("development loopback login stays local while production origin stays pinned",()=>{
 const original={NODE_ENV:process.env.NODE_ENV,AUTH_URL:process.env.AUTH_URL};
 try{
 Object.assign(process.env,{NODE_ENV:"development",AUTH_URL:"https://emw3-dashboard.win"});
 assert.equal(authOrigin("http://localhost:3000/api/auth/google"),"http://localhost:3000");
 assert.equal(authOrigin("http://127.0.0.1:3001/api/auth/google/callback"),"http://127.0.0.1:3001");
 assert.equal(authOrigin("http://[::1]:3000/access"),"http://[::1]:3000");
 assert.equal(authOrigin("https://evil.test/api/auth/google"),"https://emw3-dashboard.win");
 assert.equal(authOrigin("https://localhost.evil.test/access"),"https://emw3-dashboard.win");
 Object.assign(process.env,{NODE_ENV:"production"});
 assert.equal(authOrigin("http://localhost:3000/api/auth/google"),"https://emw3-dashboard.win");
 }finally{for(const [key,value] of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
});
