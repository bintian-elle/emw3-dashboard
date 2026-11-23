import "server-only";

import { cookies } from "next/headers";
import { ALLOWED_DOMAIN, googleProfilePicture, readSession, signAuthPayload, verifyAuthPayload, type SiteUser } from "./site-auth";
import { isLocalScriptLabHost, SCRIPT_LAB_COMPANY_COOKIE, SCRIPT_LAB_LOCAL_COMPANY_COOKIE } from "./script-lab-host";

const grantPurpose = "script-lab-company-grant";
const cookiePurpose = "script-lab-company-session";
export const companySessionAge = 60 * 15;

type CompanyProfile = Pick<SiteUser, "email" | "name" | "picture">;

function companyProfile(claims: Record<string, unknown>): CompanyProfile | null {
  const email = claims.email;
  if (typeof email !== "string" || email.split("@").length !== 2 || email.split("@")[1] !== ALLOWED_DOMAIN) return null;
  return {
    email,
    name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 160) : email,
    picture: googleProfilePicture(claims.picture),
  };
}

export function makeCompanyGrant({ email, name, picture }: CompanyProfile) {
  return signAuthPayload({ email, name, picture }, grantPurpose, 45);
}

export async function exchangeCompanyGrant(grant: string) {
  try {
    const profile = companyProfile(await verifyAuthPayload(grant, grantPurpose));
    return profile ? signAuthPayload({ ...profile }, cookiePurpose, companySessionAge) : null;
  } catch {
    return null;
  }
}

export async function getScriptLabCompanyProfile(host: string): Promise<CompanyProfile | null> {
  const jar = await cookies();
  if (isLocalScriptLabHost(host)) {
    const user = await readSession(jar.get(SCRIPT_LAB_LOCAL_COMPANY_COOKIE)?.value);
    return user ? { email: user.email, name: user.name, picture: user.picture } : null;
  }
  const value = jar.get(SCRIPT_LAB_COMPANY_COOKIE)?.value;
  if (!value) return null;
  try {
    return companyProfile(await verifyAuthPayload(value, cookiePurpose));
  } catch {
    return null;
  }
}
