import { NextResponse, type NextRequest } from "next/server";
import { getScriptLabRuleActor } from "@/lib/script-lab-rule-access";
import { isLocalScriptLabHost } from "@/lib/script-lab-host";
import { parseDimensionInput, parseRuleInput, type RuleActor } from "@/lib/script-lab-rules";
import { addScriptLabDimension, changeScriptLabRule, getScriptLabLibraryVersion, importScriptLabVariablePool, listScriptLabLibrary } from "@/lib/script-lab-rule-store";

import { parseVariablePool } from "@/lib/script-lab-variable-pool";

function reply(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function getRules(request: NextRequest, scope: RuleActor["scope"]) {
  try {
    if (scope === "internal" && !await getScriptLabRuleActor(scope, request.headers.get("host") ?? "")) return reply({ error: "forbidden" }, 403);
    const validator = request.headers.get("if-none-match");
    const cacheHeaders = { "Cache-Control": "private, no-cache" };
    if (validator && /^"script-lab-\d+"$/.test(validator)) {
      const etag = `"script-lab-${await getScriptLabLibraryVersion()}"`;
      if (validator === etag) return new NextResponse(null, { status: 304, headers: { ...cacheHeaders, ETag: etag } });
    }

    const library = await listScriptLabLibrary();
    const etag = `"script-lab-${library.version}"`;
    return NextResponse.json(library, { headers: { ...cacheHeaders, ETag: etag } });
  } catch {
    return reply({ error: "unavailable" }, 503);
  }
}

export async function mutateRules(request: NextRequest, scope: RuleActor["scope"]) {
  const host = request.headers.get("host") ?? "";
  const protocol = isLocalScriptLabHost(host) ? "http" : "https";
  if (request.headers.get("origin") !== `${protocol}://${host}`) return reply({ error: "forbidden" }, 403);
  const actor = await getScriptLabRuleActor(scope, host).catch(() => undefined);
  if (actor === undefined) return reply({ error: "unavailable" }, 503);
  if (!actor) return reply({ error: "forbidden" }, 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return reply({ error: "invalid" }, 415);

  let body: Record<string, unknown>;
  try {
    const input = await request.text();
    if (input.length > (request.method === "POST" ? 256_000 : 4096)) return reply({ error: "invalid" }, 413);
    const parsed: unknown = JSON.parse(input);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply({ error: "invalid" }, 400);
    body = parsed as Record<string, unknown>;
    if (body.kind !== "import" && input.length > 4096) return reply({ error: "invalid" }, 413);
  } catch {
    return reply({ error: "invalid" }, 400);
  }

  const inserting = request.method === "POST";
  const removing = request.method === "DELETE";
  const id = typeof body.id === "string" ? body.id : "";
  const revision = typeof body.revision === "number" ? body.revision : 0;
  if (!inserting && (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || !Number.isSafeInteger(revision) || revision < 1 || revision >= 2147483647)) {
    return reply({ error: "invalid" }, 400);
  }
  try {
    if (inserting && body.kind === "import") {
      const input = parseVariablePool(body.pool);
      if ("invalid" in input) return reply({ error: "invalid", row: input.invalid }, 400);
      return reply(await importScriptLabVariablePool(input, actor));
    }
    if (inserting && body.kind === "dimension") {
      const input = parseDimensionInput(body);
      if (!input) return reply({ error: "invalid" }, 400);
      const dimension = await addScriptLabDimension(input, actor);
      return dimension ? reply({ dimension }, 201) : reply({ error: "conflict" }, 409);
    }
    const input = removing ? undefined : parseRuleInput(body);
    if (input === null) return reply({ error: "invalid" }, 400);
    const action = inserting ? "create" : removing ? "delete" : "update";
    const rule = await changeScriptLabRule(action, actor, inserting ? "" : id, inserting ? 0 : revision, input);
    if (!rule) return reply({ error: "conflict" }, 409);
    return removing ? reply({ id }) : reply({ rule }, inserting ? 201 : 200);
  } catch (error) {
    // The unique index still protects simultaneous edits after the duplicate pre-check.
    if (error instanceof Error && ("code" in error && error.code === "23505" || /duplicate key value|Dimension layer conflict/.test(error.message))) {
      return reply({ error: "conflict" }, 409);
    }
    if (error instanceof Error && (("code" in error && error.code === "23503") || /violates foreign key constraint/.test(error.message))) return reply({ error: "invalid" }, 400);
    return reply({ error: "unavailable" }, 503);
  }
}
