import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dashboard-deploy-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.git'));
  mkdirSync(join(root, 'bin'));
  copyFileSync(new URL('../deploy.sh', import.meta.url), join(root, 'deploy.sh'));
  writeFileSync(join(root, 'package.json'), '{}');
  writeFileSync(join(root, 'package-lock.json'), '{}');
  mkdirSync(join(root, 'scripts'));
  copyFileSync(new URL('./prune-release-builds.mjs', import.meta.url), join(root, 'scripts', 'prune-release-builds.mjs'));
  for (const [tool, body] of Object.entries({
    git: '[[ "$1" == rev-parse ]] && echo 123abcd; exit 0',
    flock: 'exit 0',
    curl: 'echo "${HEALTH_STATUS:-200}"',
    sleep: 'exit 0',
    pm2: [
      'if [[ "$1" == restart ]]; then printf "%s" "$NEXT_DIST_DIR" > .active-build; fi',
      `if [[ "$1" == jlist ]]; then NEXT_DIST_DIR="$(cat .active-build)" node -e 'console.log(JSON.stringify([{name:"emw3-dashboard",pm2_env:{status:"online",pm_cwd:process.cwd(),NEXT_DIST_DIR:process.env.NEXT_DIST_DIR}},...(process.env.OTHER_BUILD?[{name:"other",pm2_env:{status:"online",pm_cwd:process.cwd(),NEXT_DIST_DIR:process.env.OTHER_BUILD}}]:[])]));'; fi`,
    ].join('\n'),
  })) {
    writeFileSync(join(root, 'bin', tool), `#!/bin/bash\necho '${tool}' "$@" >> "$TEST_LOG"\n${body}\n`, { mode: 0o755 });
  }
  writeFileSync(join(root, 'bin', 'npm'), `#!/bin/bash
echo npm "$@" >> "$TEST_LOG"
if [[ "$1" == ci ]]; then
  [[ "$FAIL_INSTALL" == 1 ]] && exit 1
  mkdir -p node_modules/.bin
  touch node_modules/.bin/next node_modules/.bin/tsc
  chmod +x node_modules/.bin/next node_modules/.bin/tsc
elif [[ "$FAIL_BUILD" == 1 ]]; then
  exit 1
else
  mkdir -p "$NEXT_DIST_DIR"
  printf "build" > "$NEXT_DIST_DIR/BUILD_ID"
fi
exit 0
`, { mode: 0o755 });
  return {
    root,
    run(extra = {}) {
      writeFileSync(join(root, 'calls'), '');
      const result = spawnSync('bash', [join(root, 'deploy.sh')], {
        env: { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}`, TEST_LOG: join(root, 'calls'), ...extra },
        encoding: 'utf8',
      });
      return { ...result, calls: readFileSync(join(root, 'calls'), 'utf8') };
    },
  };
}

test('first install, cache reuse, manifest changes and forced reinstall', t => {
  const f = fixture(t);
  const first = f.run();
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.calls, /npm ci/);
  assert.doesNotMatch(f.run().calls, /npm ci/);
  writeFileSync(join(f.root, 'package-lock.json'), '{"lockfileVersion":3}');
  assert.match(f.run().calls, /npm ci/);
  assert.match(f.run({ FORCE_INSTALL: '1' }).calls, /npm ci/);
});

test('failed build never restarts production', t => {
  const result = fixture(t).run({ FAIL_BUILD: '1' });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.calls, /pm2/);
});

test('failed install is not stamped and never builds/restarts', t => {
  const f = fixture(t);
  const result = f.run({ FAIL_INSTALL: '1' });
  assert.notEqual(result.status, 0);
  assert.equal(existsSync(join(f.root, 'node_modules/.dashboard-dependencies')), false);
  assert.doesNotMatch(result.calls, /npm run build|pm2/);
});

test('restart updates the PM2 environment to select the build just produced',t=>{
 const f=fixture(t);
 const result=f.run();
 assert.equal(result.status,0,result.stderr);
 assert.match(result.calls,/pm2 restart emw3-dashboard --update-env/);
 assert.match(readFileSync(join(f.root,'.active-build'),'utf8'),/^\.next-release-123abcd-/);
});

test('deployment builds and restarts only the production website',t=>{
 const result=fixture(t).run();
 assert.equal(result.status,0,result.stderr);
 assert.equal((result.calls.match(/npm run build/g)||[]).length,1);
 assert.doesNotMatch(result.calls,/emw3-dashboard-staging|codex\/staging/);
});

test('keeps only the live Dashboard release and any build used by another app',t=>{
 const f=fixture(t);
 for(const name of ['.next-release-old','.next-release-other','.next','.state'])mkdirSync(join(f.root,name));
 const result=f.run({OTHER_BUILD:'.next-release-other'});
 assert.equal(result.status,0,result.stderr);
 assert.equal(existsSync(join(f.root,'.next-release-old')),false);
 assert.equal(existsSync(join(f.root,'.next')),false);
 assert.equal(existsSync(join(f.root,'.next-release-other')),true);
 assert.equal(existsSync(join(f.root,'.state')),true);
 assert.equal(existsSync(join(f.root,readFileSync(join(f.root,'.active-build'),'utf8'),'BUILD_ID')),true);
});

test('preserves old builds when the new application is unhealthy',t=>{
 const f=fixture(t);
 mkdirSync(join(f.root,'.next-release-old'));
 const result=f.run({HEALTH_STATUS:'500'});
 assert.notEqual(result.status,0);
 assert.equal(existsSync(join(f.root,'.next-release-old')),true);
 assert.doesNotMatch(result.calls,/pm2 save|pm2 jlist/);
});
