#!/usr/bin/env node
// Read the visible UK 7-day For You list from AI Video's existing Chrome.
const { readFileSync } = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");

const profile = join(homedir(), ".local/share/ai-video-tiktok-chrome");
const port = Number(readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid Chrome debug port");

const limit = 20;
const cardLink = 'a[href*="/creativecenter/topads/"]';
const snapshot = `(() => {
  const text = document.body?.innerText || "";
  const seen = new Set();
  const rows = [];
  for (const a of document.querySelectorAll(${JSON.stringify(cardLink)})) {
    const url = new URL(a.href);
    const id = url.pathname.match(/topads\\/(\\d+)/)?.[1];
    let card = a;
    while (card && !(card.innerText.includes("Budget") && card.innerText.includes("CTR"))) card = card.parentElement;
    if (!id || !card || seen.has(id) || !card.getBoundingClientRect().width ||
        url.origin !== "https://ads.tiktok.com" || card.querySelectorAll(${JSON.stringify(cardLink)}).length !== 1) continue;
    const lines = card.innerText.split("\\n").map(s => s.trim()).filter(Boolean);
    const before = label => lines[lines.indexOf(label)-1];
    const metrics = { likes: before("Likes"), ctr: before("CTR"), budget: before("Budget") };
    if (!metrics.likes || !/^Top\\s+\\d+%$/i.test(metrics.ctr || "") || !metrics.budget) continue;
    seen.add(id);
    const poster = [...card.querySelectorAll('img,[style*="background-image"]')].find(e => e.getBoundingClientRect().width > 100);
    const cover = poster && (poster.currentSrc || getComputedStyle(poster).backgroundImage.match(/^url\\(["']?(https:[^"')]+)/)?.[1]);
    const caption = lines.slice(2, lines.indexOf("Likes") - 1).join(" ");
    rows.push({id, rank: rows.length + 1, url: url.origin + "/business/creativecenter/topads/" + id + "/pc/en?countryCode=GB&period=7",
      title: lines[1], caption, cover, metrics});
  }
  return { matches: /United Kingdom/.test(text) && /Last 7 days/.test(text) && /For You/.test(text), rows };
})()`;

function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  async function call(method, params) {
    await ready;
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timeout = setTimeout(() => {
        socket.removeEventListener("message", receive);
        reject(new Error(`Chrome timed out: ${method}`));
      }, 12_000);
      function receive(event) {
        const reply = JSON.parse(event.data);
        if (reply.id !== id) return;
        clearTimeout(timeout);
        socket.removeEventListener("message", receive);
        if (reply.error || reply.result?.exceptionDetails) reject(new Error(`Chrome rejected ${method}`));
        else resolve(reply.result);
      }
      socket.addEventListener("message", receive);
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  return { evaluate: async expression => (await call("Runtime.evaluate", { expression, returnByValue: true })).result.value,
    refresh: () => call("Page.reload", {}), close: () => socket.close() };
}

async function main() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(10_000) });
  const tabs = (await response.json()).filter(tab => {
    if (tab.type !== "page" || !tab.url?.startsWith("https://ads.tiktok.com/")) return false;
    const url = new URL(tab.url);
    return url.origin === "https://ads.tiktok.com" &&
      url.pathname.includes("/inspiration/topads/pc/") &&
      url.searchParams.get("region") === "GB" && url.searchParams.get("period") === "7";
  });
  const candidates = await Promise.allSettled(tabs.map(async tab => {
    const page = connect(tab);
    try {
      if (process.argv.includes("--refresh")) {
        const previous = await page.evaluate("performance.timeOrigin");
        await page.refresh();
        let loaded = false;
        for (let attempt = 0; attempt < 10 && !loaded; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1300));
          const origin = await page.evaluate("performance.timeOrigin").catch(() => null);
          loaded = typeof origin === "number" && origin !== previous;
        }
        if (!loaded) throw Error("Could not verify a fresh desktop page");
      }
      let data = await page.evaluate(snapshot);
      for (let attempt = 0; attempt < 8 && !data?.rows.length; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 1800));
        data = await page.evaluate(snapshot);
      }
      if (data.matches && data.rows.length && data.rows.length < limit) {
        for (let attempt = 0; attempt < 3 && data.rows.length < limit; attempt++) {
          await page.evaluate(`(() => {
            const last = [...document.querySelectorAll(${JSON.stringify(cardLink)})].at(-1);
            last?.scrollIntoView({block: "start"});
            document.scrollingElement?.scrollBy(0, Math.round(innerHeight * 0.75));
          })()`);
          await new Promise(resolve => setTimeout(resolve, 2500));
          const next = await page.evaluate(snapshot);
          if (next.matches && next.rows.length >= data.rows.length) data = next;
        }
      }
      return data;
    } finally {
      page.close();
    }
  }));
  const best = candidates.flatMap(result => result.status === "fulfilled" && result.value.matches ? [result.value.rows] : [])
    .sort((a, b) => b.length - a.length)[0] ?? [];
  const result = { market: "GB", periodDays: 7, sort: "For You", fetchedAt: new Date().toISOString(),
    complete: best.length >= limit, items: best.slice(0, limit) };
  process.stdout.write(JSON.stringify(result) + "\n");
  if (!result.complete) process.exitCode = 2;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
