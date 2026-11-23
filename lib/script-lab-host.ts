export const SCRIPT_LAB_PUBLIC_HOST = "public.emw3-dashboard.win";

export function isLocalScriptLabHost(host: string) {
  return process.env.NODE_ENV === "development" && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
}

export const scriptLabCookie = process.env.NODE_ENV === "production"
  ? "__Host-emw3_script_lab" : "emw3_script_lab_dev";

export const scriptLabLanguageCookie = "emw3_script_lab_language";

export const SCRIPT_LAB_COMPANY_COOKIE = "__Host-emw3_script_lab_company";
export const SCRIPT_LAB_COMPANY_ORIGIN = "https://emw3-dashboard.win";
export const SCRIPT_LAB_LOCAL_COMPANY_COOKIE = "emw3_script_lab_local_company";
