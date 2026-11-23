#!/usr/bin/env python3
"""Publish a verified UK snapshot, with explicit opt-in for partial results."""
import argparse
from datetime import datetime, timedelta, timezone
import json
import re
import subprocess
import sys
from urllib.parse import parse_qs, urlsplit


def validate(snapshot, allow_partial=False, daily_refresh=False):
    rows = snapshot.get("items", [])
    if (snapshot.get("market"), snapshot.get("periodDays"), snapshot.get("sort")) != ("GB", 7, "For You"):
        raise ValueError("Expected UK / last 7 days / For You")
    if not 1 <= len(rows) <= 20 or (not allow_partial and (len(rows) != 20 or not snapshot.get("complete"))):
        raise ValueError("Expected a complete snapshot of 20 ads")
    if daily_refresh and len(rows) < 18:
        raise ValueError("Daily refresh returned fewer than the 18 verified desktop cards")

    checked = datetime.fromisoformat(snapshot["fetchedAt"].replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)
    if not now - timedelta(days=7) < checked <= now:
        raise ValueError("Snapshot timestamp is outside the current seven-day window")

    seen = set()
    items = []
    for rank, row in enumerate(rows, 1):
        ad_id = row["id"]
        url = urlsplit(row["url"])
        query = parse_qs(url.query)
        if (row.get("rank") != rank or not re.fullmatch(r"[0-9]{15,24}", ad_id) or ad_id in seen
                or url.scheme != "https" or url.netloc != "ads.tiktok.com"
                or not re.fullmatch(rf"/business/creativecenter/topads/{ad_id}/(?:pc|pad)/en/?", url.path)
                or query.get("countryCode") != ["GB"] or query.get("period") != ["7"]):
            raise ValueError(f"Invalid or duplicate ranked ad: {rank}")
        seen.add(ad_id)
        analysis = row.get("analysis") or {}
        for required in ("hook", "takeaway") if analysis or not allow_partial else ():
            pair = analysis.get(required)
            if not isinstance(pair, list) or len(pair) != 2 or not all(isinstance(x, str) and x.strip() for x in pair):
                raise ValueError(f"Ad {rank} is missing verified creative analysis")
        if (analysis or not allow_partial) and (not isinstance(analysis.get("evidence"), str) or not analysis["evidence"].strip()):
            raise ValueError(f"Ad {rank} is missing visual evidence")
        metrics = row.get("metrics") or {}
        valid_metrics = {key: metrics[key] for key in ("likes", "ctr", "budget")
                         if isinstance(metrics.get(key), str) and metrics[key].strip()}
        if (not allow_partial or daily_refresh) and len(valid_metrics) != 3:
            raise ValueError(f"Ad {rank} is missing its original performance metrics")
        lines = row.get("text", "").splitlines()
        title = row.get("caption") or row.get("title") or (lines[1] if len(lines) > 1 else None)
        if not isinstance(title, str) or not title.strip():
            raise ValueError(f"Ad {rank} is missing a caption or title")
        item = dict(id=f"top-ads:{ad_id}", rank=rank, source="tiktok", kind="ad", market="GB",
            title=title, url=row["url"], publishedAt=None, coverageHours=168, hashtag="Top Ads")
        if row.get("cover"):
            item["cover"] = row["cover"]
        if analysis:
            item.update(hook=analysis["hook"], takeaway=analysis["takeaway"], evidence=analysis["evidence"],
                        analysisBasis=analysis.get("basis", "video"))
        if valid_metrics or not allow_partial:
            item["metrics"] = [dict(label=key, value=value) for key, value in valid_metrics.items()]
        items.append(item)
    return checked, items


def publish(checked, items, allow_partial=False, daily_refresh=False):
    expires = checked + timedelta(days=7)
    encoded = json.dumps(items, ensure_ascii=False).encode().hex()
    expire_previous = f"""UPDATE script_lab.trend_references SET expires_at = LEAST(expires_at, now())
WHERE item->>'kind' = 'ad' AND item->>'source' = 'tiktok' AND item->>'market' = 'GB'
  AND item->>'coverageHours' = '168' AND checked_at <= '{checked.isoformat()}'::timestamptz;"""
    replacement = """script_lab.trend_references.item || (excluded.item - 'title')""" if allow_partial else "excluded.item"
    preserve_metrics = """|| jsonb_build_object('metrics', CASE
      WHEN excluded.item->'metrics' = '[]'::jsonb THEN script_lab.trend_references.item->'metrics'
      ELSE excluded.item->'metrics' END)""" if allow_partial else ""
    sql = f"""
BEGIN;
SELECT pg_advisory_xact_lock(60419, 20261123);
{"" if allow_partial and not daily_refresh else expire_previous}
INSERT INTO script_lab.trend_references (id, item, checked_at, expires_at)
SELECT item->>'id', jsonb_build_object('metrics', '[]'::jsonb) || item, '{checked.isoformat()}'::timestamptz, '{expires.isoformat()}'::timestamptz
FROM jsonb_array_elements(convert_from(decode('{encoded}','hex'),'UTF8')::jsonb) AS rows(item)
ON CONFLICT (id) DO UPDATE SET item={replacement}
  {preserve_metrics},
  checked_at=excluded.checked_at, expires_at=excluded.expires_at
WHERE script_lab.trend_references.checked_at <= excluded.checked_at;
COMMIT;
"""
    subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", "emw3_script_lab"],
        input=sql, text=True, check=True, timeout=25)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--allow-partial", action="store_true", help="Publish available cards and preserve verified data")
    parser.add_argument("--daily-refresh", action="store_true", help="Refresh verified metrics and preserve stored video analysis")
    args = parser.parse_args()
    try:
        merge = args.allow_partial or args.daily_refresh
        publish(*validate(json.load(sys.stdin), merge, args.daily_refresh), allow_partial=merge, daily_refresh=args.daily_refresh)
    except (ValueError, KeyError, TypeError) as error:
        print(f"Top Ads snapshot rejected: {error}", file=sys.stderr)
        raise SystemExit(2)
