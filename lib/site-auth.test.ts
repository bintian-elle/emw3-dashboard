import test from "node:test";
import assert from "node:assert/strict";
import { allowedGoogleUser, safeReturnPath, signAuthPayload, readSession, verifyAuthPayload } from "./site-auth.ts";

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
