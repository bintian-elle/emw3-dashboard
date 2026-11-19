#!/usr/bin/env bash
# Copy the private EC2 publication into the local dashboard's ignored state directory.
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p .state
temporary=$(mktemp .state/biceek-market-overview.XXXXXX)
trap 'rm -f "$temporary"' EXIT
ssh -o BatchMode=yes -o ConnectTimeout=5 EMW3_ANC_AI 'cat /home/ubuntu/services/biceek-daily-report/state/market-overview.json' > "$temporary"
python3 - "$temporary" <<'PY'
import json
import sys

with open(sys.argv[1]) as stream:
    snapshot = json.load(stream)
if (snapshot.get("project"), snapshot.get("version"), snapshot.get("currency")) != ("biceek", 1, "USD"):
    raise SystemExit("Unexpected Biceek snapshot format")
if not snapshot.get("rows"):
    raise SystemExit("Empty Biceek snapshot")
print("Biceek data through", snapshot["through"])
PY
mv "$temporary" .state/biceek-market-overview.json
