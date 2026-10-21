#!/usr/bin/env bash
# One command from the Dashboard checkout: refresh source scope, supplement YouTube,
# sync only changed source files, and run incremental processing on the remote host.
set -euo pipefail
umask 077
cd "$(dirname "$0")/../.."
host="${CREATIVE_HOST:-EMW3_ANC_AI}"
project=/home/ubuntu/work/emw3-anc/bluevua
cache=.state/creative-source-sync
mkdir -p "$cache"
ssh "$host" 'cd /home/ubuntu/work/bintian/emw3-dashboard && node /home/ubuntu/work/emw3-anc/bluevua/tools/export_testing_creatives.mjs /home/ubuntu/work/emw3-anc/bluevua/.local/creative-library/input.json'
ssh "$host" 'cd /home/ubuntu/work/emw3-anc/bluevua && .local/markitdown-venv/bin/python -c '\''import importlib.util,json; s=importlib.util.spec_from_file_location("library","tools/creative_library.py");m=importlib.util.module_from_spec(s);s.loader.exec_module(m); items=m.inventory(json.load(open(".local/creative-library/input.json"))); print(json.dumps({k:v["url"].split("v=")[-1] for k,v in items.items() if v["kind"]=="youtube"}))'\''' > "$cache/youtube-ids.json"
python_bin="${CREATIVE_PYTHON:-python3}"
if ! "$python_bin" -c 'import sys; assert sys.version_info>=(3,10)' 2>/dev/null; then
 bundled_python="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
 if [[ -x "$bundled_python" ]]; then python_bin="$bundled_python"; else echo "Set CREATIVE_PYTHON to a Python 3.10+ executable" >&2; exit 1; fi
fi
if [[ ! -x "$cache/venv/bin/python" ]]; then
 "$python_bin" -m venv "$cache/venv"
 "$cache/venv/bin/pip" install youtube-transcript-api yt-dlp imageio-ffmpeg
fi
"$cache/venv/bin/python" scripts/creative-library/youtube-supplement.py --ids "$cache/youtube-ids.json" --output "$cache" "$@"
rsync -rc --chmod=Du=rwx,Dgo=,Fu=rw,Fgo= "$cache/youtube-captions/" "$host:$project/.local/creative-library/youtube-captions/"
rsync -rc --chmod=Du=rwx,Dgo=,Fu=rw,Fgo= "$cache/youtube-metadata/" "$host:$project/.local/creative-library/youtube-metadata/"
rsync -rc --chmod=Du=rwx,Dgo=,Fu=rw,Fgo= "$cache/youtube-media/" "$host:$project/.local/creative-library/youtube-media/"
ssh "$host" 'cd /home/ubuntu/work/emw3-anc/bluevua && nice -n 10 .local/markitdown-venv/bin/python tools/creative_library.py --root .local/creative-library --describe'
