import "server-only";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/site-auth";

export async function currentSiteUser() {
  const user=await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return user;
}
