"""Check Crawl4AI and report visible link candidates from the UK TikTok pages."""

import argparse
import asyncio
import json
from urllib.parse import urlsplit

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

SOURCES = {
    "trends": "https://ads.tiktok.com/creative/creativeCenter/trends?region=GB",
    "top_ads": "https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en?region=GB",
}


def candidate_links(result, source):
    links = {}
    for group in ("internal", "external"):
        for link in (result.links or {}).get(group, []):
            url = urlsplit(link["href"])
            host = url.hostname or ""
            if host != "tiktok.com" and not host.endswith(".tiktok.com"):
                continue
            parts = url.path.strip("/").split("/")
            is_video = "video" in parts and parts[-1].isdigit()
            is_ad = "topads" in parts and any(part.isdigit() for part in parts)
            if (source == "trends" and is_video) or (source == "top_ads" and is_ad):
                links[url._replace(query="", fragment="").geturl()] = None
    return list(links)


async def check(channel, cdp_url):
    browser = BrowserConfig(
        channel=channel,
        chrome_channel=channel,
        cdp_url=cdp_url,
        create_isolated_context=False,
        cdp_cleanup_on_close=True,
        verbose=False,
    )
    run = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, page_timeout=25000, verbose=False)
    async with AsyncWebCrawler(config=browser) as crawler:
        smoke = await crawler.arun("https://example.com", config=run)
        if not smoke.success or "Example Domain" not in (smoke.html or ""):
            raise SystemExit(f"Control page failed: {smoke.error_message or smoke.status_code}")
        summary = {"control": "passed", "browser": "existing_session" if cdp_url else "fresh", "sources": {}}
        for source, url in SOURCES.items():
            result = await crawler.arun(url, config=run)
            links = candidate_links(result, source)
            summary["sources"][source] = {
                "http_status": result.status_code,
                "loaded": result.success,
                "candidate_count": len(links),
                "sample_links": links[:3],
                "page_excerpt": " ".join(str(result.markdown or "").split())[:350],
            }
        print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--channel", default="chrome", help="Installed Chromium browser channel")
    parser.add_argument("--cdp-url", help="Loopback URL of an explicitly authorized Chrome session")
    args = parser.parse_args()
    if args.cdp_url:
        endpoint = urlsplit(args.cdp_url)
        if endpoint.scheme not in {"http", "ws"} or endpoint.hostname not in {"localhost", "127.0.0.1", "::1"}:
            parser.error("--cdp-url must use a loopback HTTP or WebSocket address")
    asyncio.run(check(args.channel, args.cdp_url))
