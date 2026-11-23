import "server-only";

import { cookies } from "next/headers";
import { currentSiteUser } from "./current-site-user";
import { getScriptLabProfile } from "./script-lab-account";
import { getScriptLabCompanyProfile } from "./script-lab-company-session";
import { scriptLabCookie, isLocalScriptLabHost } from "./script-lab-host";

export async function getVideoActor(visibility: "public" | "internal", host: string) {
  const profile = visibility === "public"
    ? await getScriptLabCompanyProfile(host) ?? await getScriptLabProfile((await cookies()).get(scriptLabCookie)?.value)
    : await currentSiteUser();
  if (profile) {
    const name = profile.name.trim();
    return { email: profile.email, name: name && name !== profile.email ? name : profile.email.split("@")[0] };
  }
  return visibility === "internal" && isLocalScriptLabHost(host) ? { email: "local-development@script-lab.invalid", name: "Local development" } : null;
}
