import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const secret=process.env.CRON_SECRET?.trim();
if(!secret)throw new Error("CRON_SECRET is not configured.");

const response=await fetch("http://127.0.0.1:3000/api/klaviyo/insights/refresh",{
 headers:{authorization:`Bearer ${secret}`},
 signal:AbortSignal.timeout(14*60*1000),
 cache:"no-store",
});
const body=await response.text();
if(!response.ok)throw new Error(`Insight refresh failed (${response.status}): ${body.slice(0,500)}`);
console.log(body);
