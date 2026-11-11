#!/usr/bin/env bash
set -euo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
echo "=== EMW3 Dashboard Deployment ==="

# Prevent two deployments from modifying dependencies/build output together.
exec 9>.git/dashboard-deploy.lock
flock -n 9 || { echo "Another deployment is already running." >&2; exit 1; }

echo "1. Pulling latest code..."
git pull --ff-only

echo "2. Checking dependencies..."
dependency_key=$(node <<'JS'
const fs = require('node:fs');
const crypto = require('node:crypto');
const hash = crypto.createHash('sha256');
for (const file of ['package.json', 'package-lock.json', '.npmrc']) {
  hash.update(file);
  if (fs.existsSync(file)) hash.update(fs.readFileSync(file));
}
hash.update(JSON.stringify([process.version, process.platform, process.arch,
  process.env.NODE_ENV || '', process.env.npm_config_omit || '']));
console.log(hash.digest('hex'));
JS
)
stamp=node_modules/.dashboard-dependencies
if [[ "${FORCE_INSTALL:-0}" == "1" || ! -f "$stamp" || ! -x node_modules/.bin/next || ! -x node_modules/.bin/tsc ]] || [[ "$(< "$stamp")" != "$dependency_key" ]]; then
  npm ci --include=dev --no-audit --no-fund
  # Only stamp a successful install; npm ci removes an old stamp itself.
  DEPLOY_DEPENDENCY_KEY="$dependency_key" node -e 'require("node:fs").writeFileSync("node_modules/.dashboard-dependencies", process.env.DEPLOY_DEPENDENCY_KEY + "\n")'
else
  echo "Dependencies unchanged; keeping node_modules."
fi

echo "3. Building Next.js in a new release directory..."
commit=$(git rev-parse --short HEAD)
build_dir=".next-release-${commit}-$(date +%s)-$$"
test ! -e "$build_dir"
NEXT_DIST_DIR="$build_dir" npm run build
test -s "$build_dir/BUILD_ID"

echo "4. Restarting application..."
NEXT_DIST_DIR="$build_dir" pm2 restart emw3-dashboard --update-env

echo "5. Checking application and pruning old builds..."
healthy=0
for attempt in $(seq 1 25); do
  status=$(curl -s --max-time 3 -o /dev/null -w '%{http_code}' "${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000/bluevua/testing}" || true)
  if [[ "$status" == 200 || "$status" == 307 ]]; then
    healthy=1
    break
  fi
  sleep 2
done
if [[ "$healthy" != 1 ]]; then
  echo "Application health check failed. Existing build directories were preserved." >&2
  exit 1
fi
pm2 save
node scripts/prune-release-builds.mjs "$build_dir"
echo "=== Deployment completed ==="
pm2 status
