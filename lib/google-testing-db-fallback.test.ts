import test from "node:test";
import assert from "node:assert/strict";
import {readGoogleTestingDatabase} from "./google-testing-db-fallback.ts";
test("connection timeout enables API fallback and backs off repeated connections",async()=>{
 globalThis.emw3GoogleTestingDbRetryAt=0;
 try{
  const result=await readGoogleTestingDatabase(async()=>{throw Error("Connection terminated due to connection timeout");});assert.equal(result,null);
  let queried=false;assert.equal(await readGoogleTestingDatabase(async()=>{queried=true;return {rows:[{spend:123}]};}),null);assert.equal(queried,false);
 }finally{globalThis.emw3GoogleTestingDbRetryAt=0;}
});
test("valid database data is retained",async()=>{const data={rows:[{spend:123}]};assert.equal(await readGoogleTestingDatabase(async()=>data),data);});
test("SQL errors are not silently converted to missing data",async()=>{const error=Object.assign(Error("column does not exist"),{code:"42703"});await assert.rejects(readGoogleTestingDatabase(async()=>{throw error;}),error);});
