#!/usr/bin/env node
// Runs on EC2 against the existing authenticated AI Video Chrome window.
const fs = require("node:fs");
const { homedir } = require("node:os");
const { join } = require("node:path");
const sleep = time => new Promise(resolve => setTimeout(resolve, time));
const profile = join(homedir(), ".local/share/ai-video-tiktok-chrome");
const port = Number(fs.readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]);
const base = `http://127.0.0.1:${port}`;
const anchor = 'a[href*="/creativecenter/topads/"]';

async function main() {
  const ids = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  if (!Array.isArray(ids) || !ids.length || ids.some(id => !/^\d{15,24}$/.test(id))) throw Error("Invalid ad ids");
  const tabs = await (await fetch(base + "/json/list", { signal: AbortSignal.timeout(8000) })).json();
  const tab = tabs.find(tab => tab.type === "page" &&
    tab.url.startsWith("https://ads.tiktok.com/business/creativecenter/inspiration/topads/pc/en") &&
    ["GB", "7"].every((value, index) => new URL(tab.url).searchParams.get(index ? "period" : "region") === value));
  if (!tab) throw Error("Open the authenticated UK last-7-days desktop Top Ads tab");
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  function call(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        socket.removeEventListener("message", receive);
        reject(Error(method + " timed out"));
      }, 10000);
      function receive(event) {
        const reply = JSON.parse(event.data);
        if (reply.id !== id) return;
        clearTimeout(timer);
        socket.removeEventListener("message", receive);
        if (reply.error || reply.result?.exceptionDetails) reject(Error(method + " failed"));
        else resolve(reply.result);
      }
      socket.addEventListener("message", receive);
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  const ev = async expression => (await call("Runtime.evaluate", { expression, returnByValue: true })).result.value;
  const move = (x, y) => call("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  const findCard = id => `(() => {
    const a = [...document.querySelectorAll(${JSON.stringify(anchor)})].find(a => a.href.match(/topads\\/(\\d+)/)?.[1] === ${JSON.stringify(id)});
    let c = a;
    while (c && !(c.innerText.includes("Budget") && c.innerText.includes("CTR"))) c = c.parentElement;
    return c && c.querySelectorAll(${JSON.stringify(anchor)}).length === 1 ? c : null;
  })()`;
  try {
    await call("Page.bringToFront");
    const valid = await ev(`(() => {const t=document.body?.innerText||"";return t.includes("United Kingdom")&&t.includes("Last 7 days")&&t.includes("See analytics")})()`);
    if (!valid) throw Error("UK seven-day filters or cards are not visible");
    for (const id of ids) {
      try {
        await move(10, 100);
        const point = await ev(`(() => {
          const c=${findCard(id)};if(!c)return null;
          const e=[...c.querySelectorAll('img,[style*="background-image"]')].find(e=>e.getBoundingClientRect().width>100)||c;
          e.scrollIntoView({block:"center",behavior:"instant"});
          const r=e.getBoundingClientRect();
          return {x:r.left+r.width/2,y:r.top+Math.min(r.height/2,180)};
        })()`);
        if (!point) { console.error(id, "card missing"); continue; }
        await move(point.x, point.y);
        let media;
        for (let attempt = 0; attempt < 8 && !media; attempt++) {
          await sleep(500);
          media = await ev(`(() => {
            const c=${findCard(id)}; const v=c?.querySelector("video");
            if(!v||v.paused||v.currentTime<=0||!v.currentSrc.startsWith("https://"))return null;
            return {src:v.currentSrc,duration:Number.isFinite(v.duration)?v.duration:null};
          })()`);
        }
        if (media) process.stdout.write(JSON.stringify({ id, ...media }) + "\n");
        else console.error(id, "hover did not start a video in the card");
      } catch (error) { console.error(id, error.message); }
    }
  } finally { socket.close(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
