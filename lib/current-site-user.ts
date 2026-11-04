import "server-only";
import { isStagingReviewer } from "@/lib/staging-review-policy";
import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/site-auth";

export async function currentSiteUser() {
  const user=await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return process.env.DEPLOYMENT_ENV === "staging" && user && !isStagingReviewer(user.email) ? null : user;
}
