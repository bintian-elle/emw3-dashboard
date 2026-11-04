import "server-only";
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { SiteLanguage } from "@/lib/site-language";
const pool = new Pool({ connectionString: process.env.KLAVIYO_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
function stagingPreference(sub:string){return join(process.env.STAGING_PREFERENCES_DIR || join(process.cwd(),'.state','staging-preferences'),createHash('sha256').update(sub).digest('hex')+'.json');}
export async function readUserLanguage(sub: string): Promise<SiteLanguage> {
  if(process.env.DEPLOYMENT_ENV==='staging'){
    try{const data=JSON.parse(await readFile(stagingPreference(sub),'utf8'));return data.language==='zh'?'zh':'en';}catch{return 'en';}
  }
  const result = await pool.query<{ language: SiteLanguage }>("select language from site_user_preferences where user_sub=$1", [sub]);
  // New users start in English; only an explicit saved choice enables Chinese.
  return result.rows[0]?.language === "zh" ? "zh" : "en";
}
export async function saveUserLanguage(sub: string, language: SiteLanguage) {
  if(process.env.DEPLOYMENT_ENV==='staging'){
    const path=stagingPreference(sub);await mkdir(join(path,'..'),{recursive:true,mode:0o700});const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify({language}),{mode:0o600});await rename(temp,path);return;
  }
  await pool.query("insert into site_user_preferences(user_sub,language) values($1,$2) on conflict(user_sub) do update set language=excluded.language,updated_at=now()", [sub, language]);
}
