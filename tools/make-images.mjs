#!/usr/bin/env node
// Renders the page's PNG images in headless Chromium (re-run after a rename, OWNER_ACTIONS A2):
//   public/og.png (1200 × 630)       the link preview in LINE, Facebook and X (they don't show SVG)
//   public/icon-192.png, icon-512.png the installed app's icons on Android
//   public/apple-touch-icon.png (180) the home-screen icon on iPhone (iOS ignores SVG icons)
// CHROME_PATH=/path/to/chromium node tools/make-images.mjs   (the text uses Noto Sans Thai from Google Fonts)
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const pub = (f) => new URL(`../public/${f}`, import.meta.url).pathname;
const icon = readFileSync(pub("icon.svg"), "utf8");
const OG = `<!doctype html><html lang="th"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;700;800&display=block" rel="stylesheet">
<style>
  body { margin: 0; width: 1200px; height: 630px; background: #0f3d5e; color: #fff; font-family: "Noto Sans Thai", sans-serif;
    display: flex; flex-direction: column; justify-content: center; padding: 0 80px; box-sizing: border-box; }
  .row { display: flex; align-items: center; gap: 32px; }
  .row svg { width: 132px; height: 132px; flex: none; }
  h1 { font-size: 88px; line-height: 1.1; margin: 0; font-weight: 800; }
  .en { font-size: 40px; opacity: .8; margin-top: 4px; }
  p { font-size: 40px; line-height: 1.45; margin: 44px 0 0; }
  .lv { display: flex; gap: 14px; margin-top: 40px; font-size: 30px; font-weight: 700; }
  .lv span { padding: 8px 22px; border-radius: 999px; color: #14202b; }
</style></head><body>
<div class="row">${icon}<div><h1>ภัยรอบบ้าน</h1><div class="en">Thai Risk · risk.autobahn.bot</div></div></div>
<p>ทุกความเสี่ยงที่จุดเดียว ตอนนี้และ 3 วันข้างหน้า<br>ร้อน ฝุ่น ฝน ลม น้ำท่วม ดินถล่ม แผ่นดินไหว ไฟป่า</p>
<div class="lv"><span style="background:#cfe3f5">ยังไม่น่าห่วง</span><span style="background:#ffe58a">ติดตามไว้</span><span style="background:#ffc28a">เตรียมตัว</span><span style="background:#ff9a9a">ทำทันที</span></div>
</body></html>`;

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/opt/pw-browsers/chromium" });
try {
  const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await og.setContent(OG, { waitUntil: "networkidle" });
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
