import "server-only";
import {readFile,mkdir,writeFile,rename} from "node:fs/promises";
import path from "node:path";
import {createHash} from "node:crypto";
import {queryGoogleTestingApi} from "@/lib/google-testing-api";
import {getMetaTestingCurrency} from "@/lib/testing-meta";
import {getRedditTestingCurrency} from "@/lib/testing-reddit";

type CurrencyVerification={scope:string;verifiedAt:string;accounts:Array<{channel:string;currency:string|null;verified:boolean}>};
let pending:Promise<CurrencyVerification>|undefined;
/** One account-metadata check per day, shared by all reporting periods. */
export function testingCurrencyVerification(){
 return pending??=(async()=>{
  const reddit=JSON.parse(await readFile(path.join(process.cwd(),"credentials/reddit.json"),"utf8")) as {Ad_Account_ID:string};
  const scope=createHash("sha256").update(JSON.stringify([process.env.GOOGLE_ADS_CUSTOMER_ID,"120251709189500383",reddit.Ad_Account_ID])).digest("hex");
  const directory=path.join(process.cwd(),".state/testing-readouts"),filename=path.join(directory,"account-currencies.json");
  try{const cached=JSON.parse(await readFile(filename,"utf8")) as CurrencyVerification;if(cached.scope===scope&&Date.now()-Date.parse(cached.verifiedAt)<86400000)return cached;}catch{}
  const sources=[
   ["Google",async()=>(await queryGoogleTestingApi<{customer:{currencyCode:string}}>("SELECT customer.currency_code FROM customer LIMIT 1"))[0]?.customer.currencyCode],
   ["Meta",getMetaTestingCurrency],
   ["Reddit",getRedditTestingCurrency],
  ] as const;
  const results=await Promise.allSettled(sources.map(async([channel,load])=>({channel,currency:await load()})));
  const accounts=results.map((result,index)=>{const currency=result.status==="fulfilled"&&/^[A-Z]{3}$/.test(result.value.currency??"")?result.value.currency!:null;return{channel:sources[index][0],currency,verified:currency!==null};});
  const value={scope,verifiedAt:new Date().toISOString(),accounts};
  if(accounts.every(account=>account.verified)){await mkdir(directory,{recursive:true,mode:0o700});const temporary=`${filename}.${process.pid}.tmp`;await writeFile(temporary,JSON.stringify(value),{mode:0o600});await rename(temporary,filename);}
  return value;
 })().finally(()=>{pending=undefined;});
}
