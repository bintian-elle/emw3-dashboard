import "server-only";

import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sendScriptLabVerification } from "./script-lab-mail";
import { googleProfilePicture } from "./site-auth";
import { queryScriptLab } from "./script-lab-store";

const deriveKey = promisify(scrypt);
const sessionDuration = 7 * 24 * 60 * 60;
const tokenPattern = /^[a-f0-9]{64}$/;
const fallbackDigest = "0".repeat(32) + ":" + "0".repeat(128);

export const scriptLabCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: sessionDuration,
} as const;

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function passwordDigest(password: string, salt: string) {
  const key = await deriveKey(password, salt, 64) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}

function passwordDigestsMatch(first: string, second: string) {
  const left = Buffer.from(first);
  const right = Buffer.from(second);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function accountAttemptAllowed(email: string) {
  const [result] = await queryScriptLab<{ allowed: boolean }>(
    `INSERT INTO script_lab.customer_auth_limits AS limits (bucket, window_start, attempts)
     VALUES ($1, now(), 1)
     ON CONFLICT (bucket) DO UPDATE SET
       window_start = CASE WHEN limits.window_start <= now() - interval '15 minutes' THEN now() ELSE limits.window_start END,
       attempts = CASE WHEN limits.window_start <= now() - interval '15 minutes' THEN 1 ELSE least(limits.attempts + 1, 9) END
     RETURNING attempts <= 8 AS allowed`,
    [hash(email)],
  );
  return result?.allowed === true;
}

export async function requestScriptLabVerification(email: string, origin: string, password: string) {
  const [account] = await queryScriptLab<{ email: string }>(
    "SELECT email FROM script_lab.customer_accounts WHERE email = $1 AND verified_at IS NOT NULL", [email],
  );
  if (account) return;

  const token = randomBytes(32).toString("hex");
  const digest = await passwordDigest(password, randomBytes(16).toString("hex"));
  await queryScriptLab(
    `INSERT INTO script_lab.customer_email_verifications (token_digest, email, expires_at, pending_password_digest)
     VALUES ($1, $2, now() + interval '30 minutes', $3) RETURNING token_digest`,
    [hash(token), email, digest],
  );
  await sendScriptLabVerification(email, `${origin}/script-lab/verify#${token}`);
}

export async function verifyScriptLabEmail(token: string, password: string) {
  if (!tokenPattern.test(token)) return false;
  const [pending] = await queryScriptLab<{ email: string; pending_password_digest: string | null }>(
    `SELECT verification.email, verification.pending_password_digest FROM script_lab.customer_email_verifications AS verification
     WHERE verification.token_digest = $1 AND verification.expires_at > now()
       AND NOT EXISTS (
         SELECT 1 FROM script_lab.customer_accounts AS account
         WHERE account.email = verification.email AND account.verified_at IS NOT NULL
       )`,
    [hash(token)],
  );
  if (!pending) return false;

  // Requiring the original password prevents someone from setting a password for another
  // person's address and then relying on that person to click an unsolicited link.
  const pendingDigest = pending.pending_password_digest;
  const digest = await passwordDigest(password, pendingDigest?.split(":")[0] ?? randomBytes(16).toString("hex"));
  if (pendingDigest && !passwordDigestsMatch(digest, pendingDigest)) return false;
  const [verified] = await queryScriptLab(
    `INSERT INTO script_lab.customer_accounts AS account (email, password_digest, verified_at)
     SELECT email, $2, now()
     FROM script_lab.customer_email_verifications
     WHERE token_digest = $1 AND expires_at > now()
       AND (pending_password_digest IS NULL OR pending_password_digest = $2)
     ON CONFLICT (email) DO UPDATE SET password_digest = excluded.password_digest, verified_at = excluded.verified_at
     WHERE account.verified_at IS NULL
     RETURNING email`,
    [hash(token), digest],
  );
  return Boolean(verified);
}

export async function signInScriptLab(email: string, password: string) {
  const [account] = await queryScriptLab<{ password_digest: string | null }>(
    "SELECT password_digest FROM script_lab.customer_accounts WHERE email = $1 AND verified_at IS NOT NULL", [email],
  );
  const digest = account?.password_digest;
  const expected = digest && /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(digest) ? digest : fallbackDigest;
  const calculated = await passwordDigest(password, expected.split(":")[0]);
  if (!passwordDigestsMatch(calculated, expected) || expected === fallbackDigest) return null;
  return createScriptLabSession(email);
}

async function createScriptLabSession(email: string) {
  const token = randomBytes(32).toString("hex");
  await queryScriptLab(
    `INSERT INTO script_lab.customer_sessions (token_digest, email, expires_at)
     VALUES ($1, $2, now() + interval '7 days') RETURNING email`,
    [hash(token), email],
  );
  return token;
}

export async function getScriptLabProfile(token?: string) {
  if (!token || !tokenPattern.test(token)) return null;
  const [profile] = await queryScriptLab<{ email: string; display_name: string | null; picture: string | null }>(
    `SELECT account.email, account.display_name, account.picture FROM script_lab.customer_sessions AS session
     JOIN script_lab.customer_accounts AS account ON account.email = session.email
     WHERE session.token_digest = $1 AND session.expires_at > now() AND account.verified_at IS NOT NULL`,
    [hash(token)],
  );
  return profile ? { email: profile.email, name: profile.display_name || profile.email, picture: googleProfilePicture(profile.picture) } : null;
}

export async function getScriptLabEmail(token?: string) {
  return (await getScriptLabProfile(token))?.email ?? null;
}

export async function signOutScriptLab(token?: string) {
  if (!token || !tokenPattern.test(token)) return;
  await queryScriptLab(
    "DELETE FROM script_lab.customer_sessions WHERE token_digest = $1 RETURNING token_digest",
    [hash(token)],
  );
}
