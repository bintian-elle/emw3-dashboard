import "server-only";
import { Pool } from "pg";
import type { SiteLanguage } from "@/lib/site-language";
const pool = new Pool({ connectionString: process.env.KLAVIYO_DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 2, connectionTimeoutMillis: 5000, statement_timeout: 5000 });
export async function readUserLanguage(sub: string): Promise<SiteLanguage> {
  const result = await pool.query<{ language: SiteLanguage }>("select language from site_user_preferences where user_sub=$1", [sub]);
  return result.rows[0]?.language === "zh" ? "zh" : "en";
}
export async function saveUserLanguage(sub: string, language: SiteLanguage) {
  await pool.query("insert into site_user_preferences(user_sub,language) values($1,$2) on conflict(user_sub) do update set language=excluded.language,updated_at=now()", [sub, language]);
}
