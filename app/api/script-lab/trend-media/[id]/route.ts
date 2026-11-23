import { execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { promisify } from "node:util";

const run = promisify(execFile);
const maxVideoBytes = 50_000_000;
const remote = process.env.NODE_ENV === "development" && process.platform !== "linux";

function ssh(command: string) {
  return run("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=5", "EMW3_ANC_AI", command],
    { encoding: "buffer", maxBuffer: maxVideoBytes, timeout: 25000 });
}

async function respond(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{15,24}$/.test(id)) return new Response(null, { status: 404 });
  const path = join(homedir(), ".local/share/script-lab/top-ads", `${id}.mp4`);
  // The filename is digits only. The remote shell expands its own home directory.
  const remotePath = `"$HOME/.local/share/script-lab/top-ads/${id}.mp4"`;
  let size: number;
  try {
    size = remote ? Number((await ssh(`stat -c %s ${remotePath}`)).stdout) : (await stat(path)).size;
  } catch {
    return new Response(null, { status: 404 });
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxVideoBytes) return new Response(null, { status: 404 });

  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  const start = !match ? 0 : match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = !match || !match[1] || !match[2] ? size - 1 : Math.min(size - 1, Number(match[2]));
  if ((range && (!match || (!match[1] && !match[2]))) || !Number.isSafeInteger(start) || start >= size || end < start) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  const length = end - start + 1;
  const headers = new Headers({
    "Content-Type": "video/mp4",
    "Content-Length": String(length),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
  const status = range ? 206 : 200;
  if (request.method === "HEAD") return new Response(null, { headers, status });

  try {
    if (!remote) {
      const stream = createReadStream(path, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { headers, status });
    }
    const { stdout } = await ssh(`dd if=${remotePath} iflag=skip_bytes,count_bytes bs=65536 skip=${start} count=${length} status=none`);
    if (stdout.length !== length) return new Response(null, { status: 503 });
    return new Response(new Uint8Array(stdout), { headers, status });
  } catch {
    return new Response(null, { status: 503 });
  }
}

export const GET = respond;
export const HEAD = respond;
