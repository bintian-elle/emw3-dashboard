import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Pool } from "pg";
import type { ScriptLabProject } from "./script-lab-project";

const run = promisify(execFile);
const database = "emw3_script_lab";
let pool: Pool | undefined;

export async function queryScriptLab<Row extends Record<string, unknown>>(query: string, params: string[] = [], localTimeout = 8000): Promise<Row[]> {
  if (process.env.NODE_ENV === "development" && process.platform !== "linux") {
    // SSH runs psql as the EC2 login using peer authentication. Encode bound values for psql.
    const sql = query.replace(/\$(\d+)/g, (_, number: string) => {
      const hex = Buffer.from(params[Number(number) - 1], "utf8").toString("hex");
      return `convert_from(decode('${hex}', 'hex'), 'UTF8')`;
    });
    const command = run("ssh", [
      "-o", "BatchMode=yes", "-o", "ConnectTimeout=5", "EMW3_ANC_AI",
      `psql -X -At -v ON_ERROR_STOP=1 -d ${database}`,
    ], { timeout: localTimeout });
    command.child.stdin?.on("error", () => undefined);
    command.child.stdin?.end(`WITH result AS (${sql}) SELECT row_to_json(result) FROM result;\n`);
    const { stdout } = await command;
    return stdout.trim() ? stdout.trim().split("\n").map((line) => JSON.parse(line) as Row) : [];
  }

  pool ??= new Pool({
    database,
    host: "/var/run/postgresql",
    max: 2,
    connectionTimeoutMillis: 5000,
    statement_timeout: 5000,
  });
  const { rows } = await pool.query<Row>(query, params);
  return rows;
}

/** Both entry points use the same EC2 record. Public reads only accept published Biceek data. */
export async function loadScriptLabProject(visibility: "public" | "internal"): Promise<ScriptLabProject | null> {
  const published = visibility === "public" ? " AND is_published" : "";
  const [project] = await queryScriptLab<ScriptLabProject & Record<string, unknown>>(
    `SELECT slug, brand, product, workspace FROM script_lab.projects WHERE slug = 'biceek'${published}`,
  );
  return project ?? null;
}
