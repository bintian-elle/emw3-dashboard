import test from "node:test";
import assert from "node:assert/strict";
import { askConversation } from "./ai-conversation.ts";

test("stable Google subject owns one conversation across email changes",()=>{
 const first=askConversation({sub:"google-one",email:"one@elle-media.com",name:"One"});
 const renamed=askConversation({sub:"google-one",email:"renamed@elle-media.com",name:"New name"});
 const other=askConversation({sub:"google-two",email:"one@elle-media.com",name:"One"});
 assert.equal(first.owner_key,renamed.owner_key);
 assert.notEqual(first.owner_key,other.owner_key);
 assert.match(first.owner_key,/^[a-f0-9]{64}$/);
 assert.equal(renamed.email,"renamed@elle-media.com");
 assert.equal(first.project,"bluevua");
});
