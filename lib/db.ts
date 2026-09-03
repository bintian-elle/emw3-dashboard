import "server-only";
import { Pool } from "pg";

declare global {
  var emw3PostgresPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export const db = globalThis.emw3PostgresPool ?? createPool();

if (process.env.NODE_ENV !== "production") globalThis.emw3PostgresPool = db;
