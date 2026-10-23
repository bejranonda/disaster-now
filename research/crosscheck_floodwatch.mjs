#!/usr/bin/env node
// Cross-check: does this app's gauge rule (public/js/levels.js riverLevel, on ThaiWater's waterlevel_load) give the
// same status as FloodWatch's own /api/stations for the same gauge at about the same time?
//   node research/crosscheck_floodwatch.mjs <thaiwater waterlevel_load.json> <floodwatch stations.json>
// Both files fetched within a minute of each other (log: research/logs/crosscheck-floodwatch-2026-10-23.log).
import { readFileSync } from "node:fs";
import { nearGauges } from "../public/js/water.js";

const [twPath, fwPath] = process.argv.slice(2);
const tw = JSON.parse(readFileSync(twPath, "utf8"));
const fw = JSON.parse(readFileSync(fwPath, "utf8"));
const NOW = Date.now();
// every ThaiWater gauge, judged by this app (distance filter off: a point in the middle, radius the whole country)
const ours = nearGauges(tw, 13, 101, NOW, { maxKm: 5000, maxAgeH: 6 });
const NAMES = ["normal", "watch", "warning", "critical"];
const byCode = new Map((fw.stations || []).map((s) => [s.code, s]));
let both = 0;
let same = 0;
let fwUnknown = 0;
const diff = [];
const confusion = {};
for (const g of ours) {
  const f = byCode.get(g.code);
  if (!f) continue;
  if (f.status === "unknown" || g.status < 0) { fwUnknown++; continue; }
  both++;
  const o = NAMES[g.status];
  confusion[`${o}→fw:${f.status}`] = (confusion[`${o}→fw:${f.status}`] || 0) + 1;
  if (o === f.status) same++;
  else diff.push({ code: g.code, name: g.name, ours: o, fw: f.status, basis: f.status_basis, agency: f.agency,
    level: g.level, fwLevel: f.level_msl, bank: g.bank, fwBank: f.bank_msl, time: g.time, fwTime: f.obs_time });
}
console.log(`ThaiWater gauges judged by this app (fresh, with a bank): ${ours.filter((g) => g.status >= 0).length}`);
console.log(`with a FloodWatch twin of the same code and both known: ${both}; same status: ${same} (${(100 * same / both).toFixed(1)} %)`);
console.log(`skipped (FloodWatch "unknown" or ours stale/no bank): ${fwUnknown}`);
console.log("pairs (ours→FloodWatch):", JSON.stringify(confusion));
const why = { bma: diff.filter((d) => d.basis === "bma_thresholds").length, bank: diff.filter((d) => d.basis === "bank" && d.bank !== d.fwBank).length,
  level: diff.filter((d) => d.basis === "bank" && d.bank === d.fwBank && d.level !== d.fwLevel).length };
console.log("differences explained by: BMA thresholds", why.bma, "· another bank", why.bank, "· another reading", why.level,
  "· other", diff.length - why.bma - why.bank - why.level);
for (const d of diff.slice(0, 15)) console.log("  ", JSON.stringify(d));
