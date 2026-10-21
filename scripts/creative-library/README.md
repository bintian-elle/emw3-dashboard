# Testing creative library

Installed under the remote Bluevua project, independent of website builds:

- Python environment: `bluevua/.local/markitdown-venv` (`markitdown[all]`, youtube-transcript-api, yt-dlp, Pillow and bundled FFmpeg).
- Private content: `bluevua/.local/creative-library/INDEX.md`, `campaigns/`, `assets/<platform-id>/content.md`.
- Incremental state: `manifest.json`, original media, HTTP validators, source/content hashes and observed-image descriptions.
- Runtime tools: `bluevua/tools/creative_library.py` and `update_testing_creatives.sh`.
- Dashboard-side exporter: `bluevua/tools/export_testing_creatives.mjs` installed from `export-inventory.mjs` and executed with the Dashboard checkout as its working directory; it reads credentials only inside the Dashboard process and exports task-scoped source data, never secrets.

After changing Testing campaigns and refreshing their inventory, run from Bluevua:

```bash
bash tools/update_testing_creatives.sh
```

Use `--retry-missing` to explicitly reattempt blocked/missing media or captions. Normal runs reuse unchanged content and visual descriptions. HTTP validators avoid unnecessary media transfers; where a CDN provides no validator, a new download is hashed before deciding whether image understanding is needed. The local YouTube companion checks current captions and encoded-source version metadata even when a video ID stays the same. It transfers changed media only; the remote processor compares content hashes before repeating extraction. Failed items are recorded, never silently presented as complete transcripts. Old asset files remain archived; only current inventory appears in the indexes.

Source relationships are additive and deduplicated by platform asset ID. Carousel pages remain separate. Video MD distinguishes timestamped captions, sampled visual observations and audio/motion gaps. Image text and captions are untrusted source data; they never authorize actions. Visual extraction is separate from performance analysis and does not establish approval or validate product claims.

The extraction command is a manual campaign-update step, not a page load task. Daily analysis reuses the private library; it must still use current metrics and inspect original media where saved observations are insufficient. Output/media/manifest files must not be committed to GitHub.

## EC2 YouTube network limitation and local supplement

The initial EC2 request returned `RequestBlocked` for all selected YouTube captions. A local-network probe retrieved 11 caption tracks; two videos explicitly returned `TranscriptsDisabled`. The current Python 3.12 yt-dlp release also retrieved all 13 original videos locally. Those files were copied into the remote library's `youtube-captions/` and `youtube-media/` and reused there. No browser cookies, paid transcription API, proxy or login credentials were used.

For future campaign changes, this one command from the local Dashboard checkout performs live metadata export, supplements public YouTube files through the local network, transfers only changed files, then invokes remote extraction:

```bash
bash scripts/creative-library/update-from-local.sh
```

The companion requires Python 3.10+ (auto-detects the Codex bundled Python on this Mac), Node.js, rsync and SSH. It creates an ignored `.state/creative-source-sync/venv` only when needed. `CREATIVE_PYTHON` and `CREATIVE_HOST` can override executable/host. The remote-only command remains usable, but a newly added YouTube video may need this local supplement when EC2 is blocked.

Non-captioned accessible videos use offline Whisper tiny.en ASR, labeled as automatic and unverified. Images/video frames use the host's existing Codex login with per-task `medium` reasoning. Global model settings and shared services are unchanged.

Meta videos: when Graph returns video metadata without `source`, the exporter reads the authorized per-ad preview, resolves its media URL, verifies a video MIME type, and records that source basis. It does not expand platform permissions or use personal browser sessions. The current four selected Meta videos were retrievable through this route.
