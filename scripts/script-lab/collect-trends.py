#!/usr/bin/env python3
"""Collect public references on EC2 into the shared Script Lab database."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import json
from pathlib import Path
import subprocess
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

MARKETS = ("GB", "US", "DE", "NL", "FR", "CH", "ES", "IT")
INSTAGRAM_CONFIG = Path.home() / "work/anc-data-tools/.local/secrets/instagram/biceek-anc.json"

def read(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), timeout=12) as response:
        return response.read(2_000_000).decode()

def google(market):
    url = f"https://trends.google.com/trending/rss?geo={market}"
    now = datetime.now(timezone.utc)
    items = []
    for entry in ET.fromstring(read(url)).findall("./channel/item"):
        title = entry.findtext("title")
        date = parsedate_to_datetime(entry.findtext("pubDate"))
        if not title or not now - timedelta(hours=24) <= date <= now:
            continue
        fields = {child.tag.split("}")[-1]: child.text for child in entry}
        items.append(dict(id=f"google:{market}:{title}", source="google", kind="search", title=title,
            url=f"https://trends.google.com/trending?geo={market}", market=market, publishedAt=date.isoformat(),
            coverageHours=24, metrics=[dict(label="volume", value=fields["approx_traffic"])] if fields.get("approx_traffic") else []))
    return items

def instagram():
    config = json.loads(INSTAGRAM_CONFIG.read_text())
    account = config["instagram_account_id"]
    headers = {"Authorization": "Bearer " + config["access_token"], "Accept": "application/json"}
    def graph(path, params):
        url = f"https://graph.facebook.com/v26.0/{path}?{urllib.parse.urlencode(params)}"
        request = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(request, timeout=12) as response:
            return json.loads(response.read(1_000_000))["data"]

    items = {}
    for tag in ("bikecommuting", "bikecommute", "cyclinglife"):
        try:
            matches = graph("ig_hashtag_search", {"user_id": account, "q": tag})
            if not matches:
                continue
            media = graph(f"{matches[0]['id']}/recent_media", {"user_id": account,
                "fields": "id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count", "limit": 30})
        except urllib.error.HTTPError as error:
            detail = json.loads(error.read()).get("error", {})
            print("instagram", tag, "HTTP", error.code, "Graph code", detail.get("code"), flush=True)
            continue
        for post in media:
            if post.get("media_type") != "VIDEO" or not post.get("timestamp") or not post.get("permalink"):
                continue
            post_id = f"instagram:{post['id']}"
            caption = (post.get("caption") or "").splitlines()
            items[post_id] = dict(id=post_id, source="instagram", kind="video",
                title=caption[0][:180] if caption else f"#{tag}", url=post["permalink"], market=None,
                publishedAt=post["timestamp"], coverageHours=168, hashtag=f"#{tag}", video=post.get("media_url"),
                metrics=[dict(label=label, value=f"{int(post[key]):,}")
                    for label, key in (("likes", "like_count"), ("comments", "comments_count")) if post.get(key) is not None])
    return list(items.values())

def save(items):
    lines = []
    for item in items:
        payload = json.dumps(item, ensure_ascii=False).encode().hex()
        hours = 720 if item["source"] == "instagram" else item["coverageHours"]
        lines.append(f"""INSERT INTO script_lab.trend_references (id,item,expires_at)
        SELECT value->>'id', value, (value->>'publishedAt')::timestamptz + interval '{hours} hours'
        FROM (SELECT convert_from(decode('{payload}','hex'),'UTF8')::jsonb AS value) AS input
        ON CONFLICT (id) DO UPDATE SET item=CASE
          WHEN excluded.item->>'source'='google'
            AND trend_references.item->>'publishedAt'=excluded.item->>'publishedAt'
            AND trend_references.item ? 'searchAnalysis'
          THEN excluded.item || jsonb_build_object('searchAnalysis',trend_references.item->'searchAnalysis')
          ELSE excluded.item END, expires_at=excluded.expires_at, checked_at=now();""")
    if lines:
        subprocess.run(["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1", "-d", "emw3_script_lab"],
            input="BEGIN;\n" + "\n".join(lines) + "\nCOMMIT;\n", text=True, check=True, timeout=20)

def fetch(source):
    try:
        items = instagram() if source == "instagram" else google(source)
        print(source, len(items), flush=True)
        return items
    except (OSError, ValueError, KeyError, TypeError, ET.ParseError) as error:
        print(source, type(error).__name__, flush=True)
        return []

if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=4) as pool:
        save([item for items in pool.map(fetch, (*MARKETS, "instagram")) for item in items])
