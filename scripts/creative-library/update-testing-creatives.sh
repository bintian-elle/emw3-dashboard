#!/usr/bin/env bash
set -euo pipefail
umask 077
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
dashboard_checkout="${DASHBOARD_CHECKOUT:-/home/ubuntu/work/bintian/emw3-dashboard}"
cd "$project_root"
(
  cd "$dashboard_checkout"
  node "$project_root/tools/export_testing_creatives.mjs" "$project_root/.local/creative-library/input.json"
)
exec nice -n 10 "$project_root/.local/markitdown-venv/bin/python" tools/creative_library.py --root "$project_root/.local/creative-library" --describe "$@"
