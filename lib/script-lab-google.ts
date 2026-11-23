import "server-only";

import { isPublicScriptLabSectionPath } from "./script-lab-navigation";
import { isLocalScriptLabHost, SCRIPT_LAB_COMPANY_ORIGIN, SCRIPT_LAB_PUBLIC_HOST } from "./script-lab-host";

export function scriptLabGoogleOrigin(host: string) {
  if (host === SCRIPT_LAB_PUBLIC_HOST) return `https://${host}`;
  return isLocalScriptLabHost(host) ? `http://${host}` : null;
}

export function scriptLabCompanySignIn(origin: string, returnTo: string) {
  const local = new URL(origin).protocol === "http:";
  // The company OAuth client already trusts the Dashboard callback on port 3000.
  const dashboard = local ? "http://localhost:3000" : SCRIPT_LAB_COMPANY_ORIGIN;
  const url = new URL("/api/auth/google", dashboard);
  url.searchParams.set("returnTo", local ? returnTo : `/api/script-lab/company-return?${new URLSearchParams({ view: returnTo })}`);
  return url;
}

export function scriptLabGoogleReturnTo(value: unknown) {
  if (typeof value === "string" && (isPublicScriptLabSectionPath(value) || value === "/script-lab?view=rules" || value === "/script-lab/rule-history")) return value;
  return "/script-lab";
}
