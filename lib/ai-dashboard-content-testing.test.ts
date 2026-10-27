import { test } from "node:test";
import assert from "node:assert/strict";
import { contentTestingQuery, wantsContentTesting, type ContentTestingSnapshot } from "./ai-dashboard-content-testing.ts";
const snapshot: ContentTestingSnapshot = { project: "bluevua", sourcePage: "/bluevua/testing", range: { start: "2026-10-01", end: "2026-10-20" }, tests: [{ channel: "meta", campaign: "Allowed", data: { spend: null, ads: [{ id: "scoped" }] } }], concluded: [], dataGaps: [], metricContract: {}, navigationLinks: [] };
test("Content Testing intent stays within Bluevua and latest user context", () => {
  assert.equal(wantsContentTesting("bluevua", "Content Testing"), true);
  assert.equal(wantsContentTesting("bluevua", "素材测试"), true);
  assert.equal(wantsContentTesting("other", "Content Testing"), false);
  assert.equal(wantsContentTesting("bluevua", "compare ads", [{ role: "user", content: "内容测试" }]), true);
  assert.equal(wantsContentTesting("bluevua", "compare ads", [{ role: "assistant", content: "Content Testing" }]), false);
  assert.equal(wantsContentTesting("bluevua", "compare ads", [{ role: "user", content: "Content Testing" }, { role: "user", content: "unrelated" }]), false);
});
test("filters reject scope expansion and preserve exact data including nulls", () => {
  assert.throws(() => contentTestingQuery(snapshot, { sql: "select *" }));
  assert.throws(() => contentTestingQuery(snapshot, { campaign: "Account campaign" }));
  assert.throws(() => contentTestingQuery(snapshot, { channel: "social" }));
  const result = contentTestingQuery(snapshot, { channel: "meta", campaign: "Allowed" });
  assert.deepEqual(result.range, snapshot.range);
  assert.deepEqual(result.tests, snapshot.tests);
  assert.equal((result.tests[0].data as { spend: null }).spend, null);
  assert.equal(contentTestingQuery(snapshot, { channel: "reddit" }).tests.length, 0);
  assert.equal(snapshot.dataGaps.length, 0);
});

test('MCP Content Testing requests cannot substitute whole-account datasets',async()=>{
 const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');const path=await import('node:path');const {spawnSync}=await import('node:child_process');
 const directory=await mkdtemp(path.join(tmpdir(),'builder-testing-scope-'));
 try{
  const file=path.join(directory,'testing.json');await writeFile(file,JSON.stringify(snapshot));
  const messages=[{jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'query_content_testing',arguments:{channel:'meta'}}},{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'query_snapshot',arguments:{source:'google_ads',groupBy:'campaign',start:snapshot.range.start,end:snapshot.range.end}}}];
  const child=spawnSync(process.execPath,['--experimental-strip-types','scripts/ai-dashboard-mcp.ts',path.join(directory,'audit')],{cwd:process.cwd(),env:{...process.env,AI_DASHBOARD_PROJECT:'bluevua',AI_DASHBOARD_CONTENT_TESTING_FILE:file},input:messages.map(row=>JSON.stringify(row)).join('\n')+'\n',encoding:'utf8',timeout:10000});
  assert.equal(child.status,0,child.stderr);
  const responses=child.stdout.trim().split('\n').map(line=>JSON.parse(line));
  const scoped=responses.find(row=>row.id===1).result;assert.equal(scoped.isError,undefined);assert.equal(JSON.parse(scoped.content[0].text).tests[0].campaign,'Allowed');
  const account=responses.find(row=>row.id===2).result;assert.equal(account.isError,true);assert.match(account.content[0].text,/whole-account reports are not permitted/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
