import { createHash } from "node:crypto";
import type { SiteUser } from "./site-auth";

export function askConversation(user: SiteUser) {
  // Google's stable subject owns the conversation; email is display metadata.
  return { project: "bluevua" as const, kind: "ask" as const,
    owner_key: createHash("sha256").update(`google\0${user.sub}`).digest("hex"), email: user.email };
}

export function persistentConversationsEnabled() {
  return process.env.CODEX_BRIDGE_CONVERSATIONS_ENABLED === "true";
}
