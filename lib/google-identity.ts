import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export async function verifyGoogleIdentity(token: string, clientId: string, nonce: string) {
  const { payload } = await jwtVerify(token, googleKeys, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"],
    requiredClaims: ["sub", "exp", "nonce"],
  });
  if (payload.nonce !== nonce) throw new Error("Google nonce did not match");
  return payload;
}
