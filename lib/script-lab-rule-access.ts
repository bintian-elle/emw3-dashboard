import "server-only";

import { cookies } from "next/headers";
import { currentSiteUser } from "./current-site-user";
import { getScriptLabCompanyProfile } from "./script-lab-company-session";
import { getScriptLabEmail } from "./script-lab-account";
import { isLocalScriptLabHost, scriptLabCookie } from "./script-lab-host";
import type { RuleActor } from "./script-lab-rules";

export async function getScriptLabRuleActor(scope: RuleActor["scope"], host: string): Promise<RuleActor | null> {
  if (scope === "customer") {
    const company = await getScriptLabCompanyProfile(host);
    if (company) return { scope: "internal", email: company.email };
    const email = await getScriptLabEmail((await cookies()).get(scriptLabCookie)?.value);
    return email ? { scope, email } : null;
  }

  const user = await currentSiteUser();
  if (user) return { scope, email: user.email };
  return isLocalScriptLabHost(host) ? { scope, email: "local-development@script-lab.invalid" } : null;
}
