import { readFile, mkdir, open, link, unlink } from "node:fs/promises";
import path from "node:path";

export function finalizationDate(end) {
  const date = new Date(`${end}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 10);
  return date.toISOString();
}

export function metricGroup(row, index) {
  const spend = Number(row.cost_micros) / 1e6, revenue = Number(row.conversions_value), orders = Number(row.conversions), impressions = Number(row.impressions), clicks = Number(row.clicks);
  const ratio = (a, b) => b > 0 ? a / b : null;
  return {label: index === 0 ? "Group A" : "Group B", name: `${row.arm_type === "TREATMENT" ? "Test" : "Control"} · ${row.campaign_name}`, adGroupId: row.experiment_arm_id, spend, revenue, orders, impressions, clicks, cpa: ratio(spend, orders), cvr: ratio(orders, clicks), roas: ratio(revenue, spend), ctr: ratio(clicks, impressions), cpc: ratio(spend, clicks)};
}

// Page rendering never invokes this collector. Existing files are immutable.
export async function collectSnapshots({query, definitions, directory, now = new Date()}) {
  await mkdir(directory, {recursive: true, mode: 0o700});
  const outcomes = [];
  for (const test of definitions) {
    const filename = path.join(directory, `${test.id}.json`);
    const lockFile = `${filename}.lock`;
    let lock;
    try { lock = await open(lockFile, "wx", 0o600); }
    catch(error) { if(error.code!=="EEXIST")throw error; outcomes.push({id:test.id,status:"collection already running"}); continue; }
    try {
    try { const existing = JSON.parse(await readFile(filename, "utf8")); if (existing.finalized) { outcomes.push({id: test.id, status: "already frozen"}); continue; } }
    catch (error) { if (error.code !== "ENOENT") throw error; }
    if (!test.experimentId) continue;
    const metadata = await query("SELECT start_date::text, end_date::text, status FROM dim_experiment WHERE experiment_id=$1", [test.experimentId]);
    const experiment = metadata.rows[0];
    if (!experiment?.start_date || !experiment.end_date || !["HALTED", "ENDED", "PROMOTED"].includes(experiment.status)) { outcomes.push({id: test.id, status: "awaiting conclusion"}); continue; }
    const due = finalizationDate(experiment.end_date);
    if (now < new Date(due)) { outcomes.push({id: test.id, status: "awaiting day 10"}); continue; }
    const result = await query(`SELECT a.experiment_arm_id,a.arm_type,c.campaign_name,
      SUM(f.cost_micros) cost_micros,SUM(f.conversions_value) conversions_value,
      SUM(f.conversions) conversions,SUM(f.impressions) impressions,SUM(f.clicks) clicks,
      MIN(f.date)::text first_date,MAX(f.date)::text last_date,COUNT(DISTINCT f.date)::integer days,
      MIN(f.updated_at)::text oldest_update,MAX(f.updated_at)::text latest_update,
      json_agg(json_build_object('date',f.date::text,'spend',f.cost_micros/1000000.0,'revenue',f.conversions_value,'orders',f.conversions,'impressions',f.impressions,'clicks',f.clicks) ORDER BY f.date) daily
      FROM bridge_experiment_arm a JOIN dim_campaign c USING(customer_id,campaign_id)
      JOIN fact_experiment_arm_daily f USING(customer_id,experiment_id,experiment_arm_id,campaign_id)
      WHERE a.experiment_id=$1 AND f.date BETWEEN $2::date AND $3::date
      GROUP BY a.experiment_arm_id,a.arm_type,c.campaign_name ORDER BY a.arm_type DESC`, [test.experimentId, experiment.start_date, experiment.end_date]);
    const expectedDays = Math.round((new Date(experiment.end_date) - new Date(experiment.start_date)) / 86400000) + 1;
    if (result.rows.length !== 2 || !result.rows.some(row => row.arm_type === "CONTROL") || !result.rows.some(row => row.arm_type === "TREATMENT") || result.rows.some(row => row.days !== expectedDays)) throw new Error(`Incomplete experiment data: ${test.id}`);
    const finalized = result.rows.every(row => row.oldest_update && new Date(row.oldest_update) >= new Date(due));
    const sourceUpdatedAt = result.rows.map(row => row.latest_update).filter(Boolean).sort().at(-1) ?? null;
    const snapshot = {version: 1, finalized, sourceUpdatedAt, testId: test.id, experimentId: test.experimentId, capturedAt: now.toISOString(), finalizationDueAt: due, source: "fact_experiment_arm_daily", dailyGroups: result.rows.map((row,index)=>({label:index===0?"Group A":"Group B",name:metricGroup(row,index).name,adGroupId:row.experiment_arm_id,days:row.daily})), report: {campaignName: test.campaignName, campaignStatus: "Concluded", periodLabel: "Test lifetime", period: {start: experiment.start_date, end: experiment.end_date}, groups: result.rows.map(metricGroup)}};
    const temporary = `${filename}.${process.pid}.tmp`;
    const handle = await open(temporary, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify(snapshot)); await handle.sync(); await handle.close();
      try { await link(temporary, filename); outcomes.push({id: test.id, status: finalized ? "frozen" : "provisional: awaiting attribution backfill"}); }
      catch (error) { if (error.code !== "EEXIST") throw error; const existing = JSON.parse(await readFile(filename,"utf8")); if (!existing.finalized) { const {rename} = await import("node:fs/promises"); await rename(temporary, filename); outcomes.push({id:test.id,status:finalized ? "frozen" : "provisional: awaiting attribution backfill"}); } else outcomes.push({id: test.id, status: "already frozen"}); }
    } finally { await handle.close(); await unlink(temporary).catch(error => {if(error.code!=="ENOENT")throw error;}); }
    } finally { await lock.close(); await unlink(lockFile); }
  }
  return outcomes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const {default: env} = await import("@next/env"); env.loadEnvConfig(process.cwd());
  const {Pool} = await import("pg");
  const pool = new Pool({connectionString: process.env.DATABASE_URL, ssl: {rejectUnauthorized: false}, connectionTimeoutMillis: 10000});
  try {
    const definitions = JSON.parse(await readFile(path.join(process.cwd(), "config/concluded-tests.json"), "utf8"));
    console.log(await collectSnapshots({query: (sql, args) => pool.query(sql, args), definitions, directory: process.env.CONCLUDED_TEST_SNAPSHOT_DIR || path.join(process.cwd(), ".state/concluded-tests")}));
  } finally { await pool.end(); }
}
