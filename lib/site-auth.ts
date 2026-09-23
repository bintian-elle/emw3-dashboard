export const ACCESS_COOKIE = "emw3_access";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

export async function accessToken(secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode("emw3-dashboard-access-v1"));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function safeReturnPath(value: unknown) {
  const path = typeof value === "string" ? value : "/";
  return path.startsWith("/") && !path.startsWith("//") ? path : "/";
}
