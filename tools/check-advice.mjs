#!/usr/bin/env node
// Do this app's advice lines (public/js/actions.js) still equal บ้านรอดไหม's (Hazard-huntz public/content/kit.json →
// air, hot)? Reads the live copy (CORS *, read 23 Oct 2026) or a local file:  npm run check:advice [-- path/to/kit.json]
import { readFileSync } from "node:fs";
import { actionFor } from "../public/js/actions.js";

const arg = process.argv[2];
const kit = arg ? JSON.parse(readFileSync(arg, "utf8"))
  : await (await fetch("https://baanrodmai.autobahn.bot/content/kit.json", { headers: { "user-agent": "disaster-now-check/0.1 (+https://github.com/bejranonda/disaster-now)" } })).json();
let bad = 0;
const check = (label, ours, theirs) => {
  const ok = ours === theirs;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "DIFF"} ${label}: ${ours}${ok ? "" : `  ≠  ${theirs}`}`);
};
// PM2.5: one value inside each PCD band; the first line for everyone
const pmProbe = { blue: 10, green: 20, yellow: 30, orange: 50, red: 90 };
for (const lv of kit.air.levels) check(`PM2.5 ${lv.id}`, actionFor("pm25", pmProbe[lv.id])?.text, lv.all[0].th);
// heat index: one value inside each band; the first line for everyone
const hiProbe = { watch: 30, warn: 38, danger: 45, extreme: 55 };
for (const lv of kit.hot.levels) check(`heat ${lv.id}`, actionFor("heat", hiProbe[lv.id])?.text, lv.all[0].th);
// band edges
const edges = kit.air.levels.map((l) => l.pm).filter((x) => x != null);
check("PM2.5 band tops", JSON.stringify(edges), JSON.stringify([15, 25, 37.5, 75]));
check("heat band floors", JSON.stringify(kit.hot.levels.map((l) => l.lo)), JSON.stringify(["27.0", "33.0", "42.0", "52.0"]));
console.log(bad ? `\n${bad} difference(s): update public/js/actions.js and levels.js from Hazard-huntz` : "\nadvice and bands match Hazard-huntz");
process.exit(bad ? 1 : 0);
