import nextEnv from "@next/env";
import pg from 'pg';
import {edmDatabaseConfig} from '../lib/edm-database.mjs';
import {assertInsightCoverage} from './edm/policy.mjs';
nextEnv.loadEnvConfig(process.cwd());
const secret = process.env.CRON_SECRET?.trim();
if (!secret || !process.env.AI_WORKER_SECRET?.trim()) throw new Error("Refresh authentication configuration missing");
if (process.argv.includes("--check")) {
  console.log("Refresh configuration validated; no request submitted");
} else {
  if(process.env.EDM_DATABASE_URL){const db=new pg.Client({...edmDatabaseConfig(),connectionTimeoutMillis:12000,statement_timeout:10000});try{await db.connect();const result=await db.query('SELECT domain,end_day::text FROM edm_refresh_coverage');assertInsightCoverage(result.rows);}finally{await db.end().catch(()=>{});}}
  const deadline = Date.now() + 30 * 60 * 1000;
  let completed = false;
  while (Date.now() < deadline) {
    const response = await fetch("http://127.0.0.1:3000/api/klaviyo/insights/refresh", {
      headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(120000),
    });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(`Insight refresh failed: HTTP ${response.status}`);
    if (!result.pending) { completed = true; console.log("English and Chinese Insights refresh completed"); break; }
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  if (!completed) throw new Error("Insight refresh did not finish within 30 minutes; existing jobs retained");
}
