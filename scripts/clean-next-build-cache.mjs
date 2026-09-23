import { rm } from "node:fs/promises";
import { join } from "node:path";

const cacheDirectory = join(process.cwd(), ".next", "cache");

await rm(cacheDirectory, { recursive: true, force: true });
console.log("Cleared the disposable Next.js build cache.");
