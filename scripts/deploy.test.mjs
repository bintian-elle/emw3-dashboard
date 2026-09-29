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
  for (const tool of ['git', 'flock', 'pm2']) {
    writeFileSync(join(root, 'bin', tool), `#!/bin/bash\necho '${tool}' "$@" >> "$TEST_LOG"\n`, { mode: 0o755 });
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
