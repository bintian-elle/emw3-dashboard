#!/usr/bin/env bash
# EC2-only entry point. The AI Video worker owns missing media and analysis.
set -euo pipefail
umask 077

tools_dir=$(cd "$(dirname "$0")" && pwd)
media_dir="$HOME/.local/share/script-lab/top-ads"
install -d -m 0755 "$media_dir"
exec 9>"$media_dir/.refresh.lock"
flock -n 9 || exit 0

run_dir=$(mktemp -d /tmp/script-lab-top-ads-refresh.XXXXXX)
trap 'rm -rf -- "$run_dir"' EXIT
snapshot="$run_dir/ranking.json"
ids="$run_dir/pending.json"
urls="$run_dir/media.jsonl"

status=0
timeout 100 node "$tools_dir/read-uk-top-ads.cjs" --refresh > "$snapshot" || status=$?
if (( status != 0 && status != 2 )); then exit "$status"; fi
python3 "$tools_dir/publish-uk-top-ads.py" --daily-refresh < "$snapshot"

python3 - "$snapshot" "$media_dir" "$ids" <<'PY'
import json
from pathlib import Path
import subprocess
import sys

snapshot, directory, destination = map(Path, sys.argv[1:])
rows = subprocess.check_output(["psql", "-XAt", "-v", "ON_ERROR_STOP=1", "-d", "emw3_script_lab", "-c",
    """SELECT item::text FROM script_lab.trend_references
       WHERE item->>'market'='GB' AND item->>'kind'='ad' AND expires_at > now()"""], text=True)
stored = {row["id"]: row for row in map(json.loads, rows.splitlines())}
pending = []
for row in json.loads(snapshot.read_text())["items"]:
    ad_id = row["id"]
    current = stored[f"top-ads:{ad_id}"]
    video = directory / f"{ad_id}.mp4"
    has_media = current.get("mediaId") == ad_id and video.is_file() and video.stat().st_size > 0
    if not has_media or not current.get("videoAnalysis"):
        pending.append({"id": ad_id, "needsMedia": not has_media})
destination.write_text(json.dumps(pending))
PY

if [[ $(cat "$ids") == '[]' ]]; then
  printf 'Top Ads metrics refreshed. Existing MP4s and analysis reused.\n'
  exit 0
fi

python3 - "$ids" <<'PY' > "$run_dir/capture-ids.json"
import json, sys
print(json.dumps([row["id"] for row in json.load(open(sys.argv[1])) if row["needsMedia"]]))
PY
if [[ $(cat "$run_dir/capture-ids.json") != '[]' ]]; then
  timeout 150 node "$tools_dir/capture-top-ad-videos.cjs" "$run_dir/capture-ids.json" > "$urls"
else
  touch "$urls"
fi

cd "$HOME/work/emw3-anc/video"
{
  cat "$tools_dir/top-ads-analysis-prompt.txt"
  printf '\nPending IDs JSON: %s\nTemporary hover collection JSONL: %s\nMedia directory: %s\n' "$ids" "$urls" "$media_dir"
} > "$run_dir/prompt"
timeout 800 codex exec --ephemeral --sandbox workspace-write -c 'sandbox_workspace_write.network_access=true' \
  --add-dir "$media_dir" -o "$run_dir/result" - < "$run_dir/prompt" > "$run_dir/agent.log" 2>&1 || {
  printf 'AI Video analysis incomplete; no credentials or media URLs logged.\n' >&2
  exit 1
}
python3 - "$ids" "$media_dir" <<'PY'
import json
from pathlib import Path
import subprocess
import sys

pending, directory = map(Path, sys.argv[1:])
ids = {row["id"] for row in json.loads(pending.read_text())}
result = subprocess.check_output(["psql", "-XAt", "-v", "ON_ERROR_STOP=1", "-d", "emw3_script_lab", "-c",
    """SELECT item::text FROM script_lab.trend_references WHERE item->>'market'='GB' AND item->>'kind'='ad'"""], text=True)
finished = set()
for row in map(json.loads, result.splitlines()):
    media_id = row.get("mediaId")
    if (media_id in ids and row.get("videoAnalysis") and (directory / f"{media_id}.mp4").is_file()):
        finished.add(media_id)
print(f"AI Video queued {len(ids)} missing media or analyses, completed {len(finished)}.")
if ids != finished:
    print("Pending ad IDs:", ", ".join(sorted(ids - finished)), file=sys.stderr)
    raise SystemExit(1)
PY
