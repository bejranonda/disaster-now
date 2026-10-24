#!/usr/bin/env node
// Renders the page's PNG images in headless Chromium (re-run after a rename or a brand change, OWNER_ACTIONS A2):
//   public/og.png (1200 × 630)       the link preview in LINE, Facebook and X (they don't show SVG)
//   public/icon-192.png, icon-512.png the installed app's icons on Android
//   public/apple-touch-icon.png (180) the home-screen icon on iPhone (iOS ignores SVG icons)
// CHROME_PATH=/path/to/chromium node tools/make-images.mjs
// 0.7.0: the brand of the redesign (the house painted as the staff gauge) and the site's own font, Anuphan, embedded
// from public/fonts (no font request leaves the machine).
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const pub = (f) => new URL(`../public/${f}`, import.meta.url).pathname;
const icon = readFileSync(pub("icon.svg"), "utf8");
const font = (f) => `data:font/woff2;base64,${readFileSync(pub(`fonts/${f}`)).toString("base64")}`;
const MARK = `<svg viewBox="0 0 32 32"><path d="M16 3.6 27.4 13.4H4.6z" fill="#b3122e"/><rect x="6.8" y="14.6" width="18.4" height="3.9" fill="#e46c0a"/><rect x="6.8" y="19.7" width="18.4" height="3.9" fill="#d4c400"/><rect x="6.8" y="24.8" width="18.4" height="3.9" rx=".8" fill="#2f6fb0"/></svg>`;
// the staff gauge as the page draws it, filled to level l
const gauge = (l) => `<span class="g">${[0, 1, 2, 3].map((i) => `<i style="background:${i <= l ? ["#2f6fb0", "#c9bd00", "#e46c0a", "#b3122e"][i] : "#d5dde3"}"></i>`).reverse().join("")}</span>`;
const OG = `<!doctype html><html lang="th"><head><meta charset="utf-8"><style>
  @font-face { font-family: A; font-weight: 100 700; src: url(${font("anuphan-thai.woff2")}) format("woff2"); unicode-range: U+0E01-0E5B; }
  @font-face { font-family: A; font-weight: 100 700; src: url(${font("anuphan-latin.woff2")}) format("woff2"); }
  body { margin: 0; width: 1200px; height: 630px; background: #eef2f4; color: #13212c; font-family: A, sans-serif;
    display: flex; flex-direction: column; justify-content: center; padding: 0 84px; box-sizing: border-box; }
  .row { display: flex; align-items: center; gap: 30px; }
  .row svg { width: 128px; height: 128px; flex: none; }
  h1 { font-size: 92px; line-height: 1.05; margin: 0; font-weight: 680; letter-spacing: -1px; }
  .en { font-size: 34px; color: #5a6774; margin-top: 6px; }
  p { font-size: 44px; line-height: 1.4; margin: 46px 0 0; font-weight: 600; }
  p small { display: block; font-size: 32px; font-weight: 400; color: #3c4a57; }
  .lv { display: flex; gap: 14px; margin-top: 40px; font-size: 28px; font-weight: 620; }
  .lv > span { display: inline-flex; align-items: center; gap: 12px; padding: 10px 22px 10px 16px; border-radius: 16px; background: #fff; border: 1px solid #dce3e8; }
  .g { display: inline-flex; flex-direction: column; gap: 3px; }
  .g i { display: block; width: 12px; height: 8px; border-radius: 2px; }
</style></head><body>
<div class="row">${MARK}<div><h1>ภัยรอบบ้าน</h1><div class="en">Thai Risk · risk.autobahn.bot</div></div></div>
<p>ทุกความเสี่ยงรอบบ้าน ตอนนี้และ 3 วันข้างหน้า<small>ร้อน ฝุ่น ฝน ลม น้ำท่วม ดินถล่ม แผ่นดินไหว ไฟป่า จากข้อมูลของหน่วยงาน</small></p>
<div class="lv"><span>${gauge(0)}ยังไม่น่าห่วง</span><span>${gauge(1)}ติดตามไว้</span><span>${gauge(2)}เตรียมตัว</span><span>${gauge(3)}ทำทันที</span></div>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
try {
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.setContent(OG, { waitUntil: "load" });
  await og.evaluate(() => document.fonts.ready);
  await og.screenshot({ path: pub("og.png") });
  for (const [file, px] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const p = await browser.newPage({ viewport: { width: px, height: px } });
    // the apple icon is drawn full-bleed (iOS rounds the corners itself)
    const svg = file.startsWith("apple") ? icon.replace(/rx="\d+"/, 'rx="0"') : icon;
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${px}px;height:${px}px;display:block}</style>${svg}`);
    await p.screenshot({ path: pub(file), omitBackground: true });
  }
  console.log("wrote public/og.png, icon-192.png, icon-512.png, apple-touch-icon.png");
} finally {
  await browser.close();
}
