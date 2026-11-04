#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
[[ -f .staging-checkout ]] || { echo 'Refusing: this is not an isolated staging checkout.' >&2; exit 1; }
exec 9>.staging-deploy.lock
flock -n 9 || { echo 'Staging deployment already running.' >&2; exit 1; }
[[ "$(git branch --show-current)" == 'codex/staging' ]] || { echo 'Staging requires codex/staging branch.' >&2; exit 1; }
git pull --ff-only origin codex/staging
# This environment file belongs only to this checkout; never source a production file.
node --input-type=commonjs <<'JS'
require('@next/env').loadEnvConfig(process.cwd());
if(process.env.DEPLOYMENT_ENV!=='staging'||!process.env.STAGING_NOTES_DIR||!process.env.AUTH_URL?.startsWith('https://staging.'))throw Error('Staging environment is incomplete');
JS
export DEPLOYMENT_ENV=staging
export NEXT_DIST_DIR=".next-release-staging-$(date +%Y%m%d%H%M%S)"
export NEXT_DISABLE_BUILD_CACHE=true
dependency_key=$(node -e 'const fs=require("fs"),c=require("crypto"),h=c.createHash("sha256");for(const f of ["package.json","package-lock.json"]){h.update(fs.readFileSync(f));}h.update(process.version);console.log(h.digest("hex"))')
stamp=node_modules/.staging-dependency-key
if [[ ! -x node_modules/.bin/next || ! -f "$stamp" ]] || [[ "$(cat "$stamp")" != "$dependency_key" ]]; then
  npm ci --include=dev --no-audit --no-fund
  printf '%s\n' "$dependency_key" > "$stamp"
else
  echo 'Staging dependencies unchanged; reusing installed packages.'
fi
archive=${1:-}
if [[ -n "$archive" ]]; then
  [[ "$archive" == /home/ubuntu/.local/share/emw3-staging/incoming/staging-build-*.tgz && -f "$archive" ]] || { echo 'Invalid staging artifact path.' >&2; exit 1; }
  mkdir "$NEXT_DIST_DIR"
  tar xzf "$archive" -C "$NEXT_DIST_DIR"
  [[ -f "$NEXT_DIST_DIR/BUILD_ID" && "$(cat "$NEXT_DIST_DIR/.staging-build-commit")" == "$(git rev-parse HEAD)" ]] || { echo 'Staging artifact does not match checked-out source.' >&2; exit 1; }
else
  nice -n 15 npm run build
fi
# Keep the old service alive until the new build has succeeded.
previous_build=$(pm2 jlist | node -e 'let data="";process.stdin.on("data",chunk=>data+=chunk).on("end",()=>{const app=JSON.parse(data).find(p=>p.name==="emw3-dashboard-staging");console.log(app?.pm2_env?.NEXT_DIST_DIR||"");})')
pm2 describe emw3-dashboard-staging >/dev/null 2>&1 && pm2 delete emw3-dashboard-staging
pm2 start npm --name emw3-dashboard-staging -- start -- --hostname 127.0.0.1 --port 3100
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:3100/access >/dev/null; then break; fi
  if [[ "$attempt" -eq 30 ]]; then
    echo 'Staging startup failed; restoring the previous build.' >&2
    pm2 delete emw3-dashboard-staging || true
    if [[ "$previous_build" == .next-release-staging-* && -f "$previous_build/BUILD_ID" ]]; then
      NEXT_DIST_DIR="$previous_build" pm2 start npm --name emw3-dashboard-staging -- start -- --hostname 127.0.0.1 --port 3100
      pm2 save
    fi
    exit 1
  fi
  sleep 1
done
pm2 save
[[ -z "$archive" ]] || rm -- "$archive"
# Keep current and previous timestamped staging builds only. Never touch production
# builds or durable .state/notes, and never follow directory symlinks.
node --input-type=commonjs <<'JS'
const fs=require('fs');
const builds=fs.readdirSync('.',{withFileTypes:true}).filter(d=>d.isDirectory()&&!d.isSymbolicLink()&&/^\.next-release-staging-[0-9]{14}$/.test(d.name)).map(d=>d.name).sort().reverse();
for(const dir of builds.slice(2))if(dir!==process.env.NEXT_DIST_DIR)fs.rmSync(dir,{recursive:true});
JS
