import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { currentSiteUser } from "@/lib/current-site-user";
import { biceekRunsOnEc2, readMarketSnapshot } from "@/lib/biceek-market-snapshot";

export const maxDuration = 120;

const run = promisify(execFile);
const minimumSyncInterval = 45_000;
let lastSync = 0;
let sync: Promise<void> | undefined;
let collecting = false;
let lastManualRefresh = 0;

function canSyncPreview() {
  return process.env.NODE_ENV === "development" && !process.env.BICEEK_MARKET_SNAPSHOT;
}

async function syncLatest(force = false) {
  if (!canSyncPreview()) return;
  if (sync) {
    await sync;
    if (!force) return;
  }
  if (!force && Date.now() - lastSync < minimumSyncInterval) return;
  lastSync = Date.now();
  sync = run("/bin/bash", ["scripts/biceek/pull-preview.sh"], { timeout: 12_000 })
    .then(() => undefined)
    .finally(() => { sync = undefined; });
  await sync;
}

async function status() {
  const snapshot = await readMarketSnapshot();
  return Response.json({ refreshedAt: snapshot?.refreshedAt ?? null, canRefresh: biceekRunsOnEc2() || canSyncPreview() }, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET() {
  if (!await currentSiteUser()) return Response.json({}, { status: 401 });
  await syncLatest().catch(() => undefined);
  return status();
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && (!URL.canParse(origin) || new URL(origin).host !== request.headers.get("host"))) {
    return Response.json({}, { status: 403 });
  }
  if (!await currentSiteUser()) return Response.json({}, { status: 401 });
  const onEc2 = biceekRunsOnEc2();
  if (!onEc2 && !canSyncPreview()) return Response.json({}, { status: 503 });
  if (collecting || Date.now() - lastManualRefresh < 60_000) return Response.json({}, { status: 429 });
  collecting = true;
  lastManualRefresh = Date.now();
  try {
    const service = ["start", "biceek-market-overview.service"];
    if (onEc2) {
      await run("/usr/bin/sudo", ["-n", "/usr/bin/systemctl", ...service], { timeout: 105_000 });
    } else {
      await run("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=5", "EMW3_ANC_AI",
        `sudo -n systemctl ${service.join(" ")}`], { timeout: 105_000 });
    }
    await syncLatest(true);
    return status();
  } catch (error) {
    console.error("Biceek refresh failed", error instanceof Error ? error.message : error);
    return Response.json({}, { status: 502 });
  } finally {
    collecting = false;
  }
}
