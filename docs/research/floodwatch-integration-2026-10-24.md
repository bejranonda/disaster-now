# FloodWatch's API for this page, and what changed (24 Oct 2026, evening)

The owner asked how this page can benefit from FloodWatch (https://flood.autobahn.bot) and its API, what live data it
can take from it, and whether this project has FloodWatch's VPN rotation. Read from FloodWatch's repository
(`bejranonda/flood2026-research` at `4d700de`, read-only) and its live API, from `autobahn-bot`, 20:10–20:30 UTC, with
the collector's honest User-Agent. Whether FloodWatch could warn Hat Yai 4–6 h ahead is
[floodwatch-hatyai-leadtime-2026-10-24](floodwatch-hatyai-leadtime-2026-10-24.md).

## 1. What FloodWatch's API offers

| Endpoint | What it gives | Size, 20:15 UTC | Used here |
|---|---|---|---|
| `/api/stations` | every gauge (1,408): FloodWatch's status by its bank rule, freeboard, % of bank, the measured 12–72 h change, the 12/24/48/72 h outlook (median, likely range, 90 % range, method, **skill against "no change"**), bank chances (24/48 h), the learned **upstream gauges with travel times** (`upstream` [{code, lag_h}]), quality notes | 2.47 MB | **yes, from 0.6.0** (the collector, every 15 min) |
| `/api/risks` | the "⚠️ จับตา" tab: gauges in six groups (over the bank, may reach it in 24/48 h, upstream rising, fast rise, near the bank, heavy-rain provinces), and each group's **track record over the last 30 days** | 18.6 KB | **yes, from 0.6.0** |
| `/api/point?lat&lon` | the point check (area category, nearest river, measured rain, citizen reports) | ~30 KB | no: no CORS for this origin (B1), and a point is a visitor's position: it would leave the phone for a second server |
| `/api/rain` | forecast rain per point (24/72 h) and the wettest measured gauge per region | 35.7 KB | no (the page reads the ensemble and the gauges itself) |
| `/api/dwr` | DWR's early-warning posts, trend only | 136 KB | no (no bank, no status: FloodWatch's own rule) |
| `/api/situation`, `/api/summary` | the national ticker and one sentence | 4.7 KB, 0.6 KB | no |
| `/api/health` | each source's last success and failures | 8.5 KB | read once for this study: latest observation 10 min old, BMA's DDS failing 5 times in a row |

None sends CORS headers (checked again: no `access-control-allow-origin`), which doesn't matter for the collector:
it reads them server-side and publishes what the page needs as one file of its own.

## 2. What the collector now publishes (`floodwatch.json`)

One row per gauge with a position that FloodWatch doesn't reject: code, name, river, position, **FloodWatch's own
status**, freeboard, % of bank, reading time, stale flag, the 24-h outlook `[direction, median, likely low, likely
high, skill, FloodWatch's word]`, the measured 24-h change (cm), the **"⚠️ จับตา" group** (with its band and hours, or
the upstream gauge, its travel time and rise), the upstream links, a quality flag (erratic, stuck, hidden values,
suspect datum), the agency. Plus FloodWatch's track records.

- 1,374 rows, 257 KB raw, about 68 KB gzipped (Cloudflare compresses JSON on the way out). One KV write a run.
- **Stale is missing, never calm:** the page uses the file only while it is under 2 h old (the S12 rule), and each
  gauge only while its reading is under 3 h old (FloodWatch's own `STALE_MIN`).

## 3. What the page does with it

1. **The flood tile reads FloodWatch's own rows when the file is fresh** (BMA's canals included), and ThaiWater's,
   read from the phone, when it isn't. So the tile still judges the gauges when FloodWatch's server is down; only
   FloodWatch's lines go missing. This closes **KI-007**, without the CORS change it waited for:

   | Point (20:26 UTC) | Gauges within 20 km, fresh | Area index | Before (ThaiWater only) |
   |---|---|---|---|
   | Bangkok old town (13.756, 100.502) | 165, 141 fresh | ยังรับน้ำได้ from 3 canal gauges 0.4–0.7 km away, confidence **medium** | 8 Bangkok gauges, confidence often "ต่ำมาก" |
   | Lat Phrao (13.79, 100.608) | 163, 140 | ยังรับน้ำได้, 3 canal gauges from 1.2 km, **medium** | |
   | Ayutthaya (14.35, 100.57) | 18, 15 | เฝ้าระวัง, 1 gauge at 1.5 km, low | |
   | Hat Yai city (7.005, 100.47) | 16, **3** | **no gauge within 8 km**: RID's X.44 was 4.4 h old (stale) | the same: X.44 lags |

2. **FloodWatch's look ahead, in its words, with its record.** For a gauge that judges the point, the card's first
   line repeats FloodWatch's group with how often it came true in the last 30 days (`/api/risks` → `records`, 24 Oct):

   | Group | Line | Record (30 days) | The tile |
   |---|---|---|---|
   | may reach the bank, > 50 % (24 h) | "📈 FloodWatch: {gauge} อาจถึงตลิ่งใน 24 ชม. · 30 วันที่ผ่านมา FloodWatch บอกแบบนี้ 459 ครั้ง เกิดจริง 65%" | 459, 65 % | at least เตรียมตัว (a forecast's ceiling) |
   | may reach the bank, 25–50 % | the same | 383, 14 % | at least เฝ้าระวัง |
   | upstream rising (FloodWatch: the gauge at watch or warning and a learned upstream gauge, 3–48 h away, up ≥ 30 cm in 24 h) | "⬆️ น้ำจากต้นน้ำ: {upstream} ขึ้น {cm} ซม. ใน 24 ชม. น้ำจากจุดนั้นมักถึง {gauge} ในราว {h} ชม. ช้าหรือเร็วกว่านี้ได้ (FloodWatch)" | 8,215, 55 % | the gauge's own level (it is already at watch or warning) |
   | fast rise (FloodWatch's `strong_rise`) | "📈 FloodWatch คาดว่าน้ำที่ {gauge} จะขึ้นเร็ว ราว {cm} ซม. ใน 24 ชม." | 1,504, 54 % | at least เฝ้าระวัง |

   A tile a forecast raised says so in its word ("อาจถึงตลิ่ง (FloodWatch)", "น้ำขึ้นเร็ว (FloodWatch)"), never
   "ปกติ" on an orange tile. Live at 20:26 UTC, Palian (Trang) showed the upstream line: Khuan Kalong up 249 cm in
   24 h, about 9 h above the town's gauge.
3. **FloodWatch's 24-h outlook for the tile's gauge**, only when it beats "no change" (skill > 0) and its likely
   range is 0.75 m or narrower (FloodWatch's `WIDE_LIKELY_M`): "FloodWatch คาด 24 ชม. ที่ {gauge}: ทรงตัว (น่าจะ −12
   ถึง +1 ซม.)".

**A mistake caught on live data before it shipped.** The first version took the look ahead from any gauge within
20 km. At Lat Phrao a sluice gate 12.6 km away, across the river in Bang Krachao (outside the walls), raised the tile
to เตรียมตัว while every canal near the point read normal; the old town went yellow from a canal 8.4 km away. The
look ahead now comes only from the gauges that judge the point (the area index's basis: within 3 km, else 8 km, canals
only in Bangkok's polders). Test: `test/flood.test.mjs` "only a gauge that judges the point".

**Fixed on the way (KI-008's last line).** In Bangkok, C.12 (a river outside the walls with 1.54 m to spare) was listed
without a status word, then explained under it: "“ใกล้ล้นตลิ่ง” ที่ กรมชลประทานสามเสน เพราะน้ำสูง 91% …". The reason
line and the outlook now follow the same rule as the status word.

## 4. The measured rain over 3 days (`rain3d.json`)

FloodWatch keeps every rain reading in its database but publishes only the wettest gauge per region. So the collector
reads ThaiWater's `rain_24h` (4,749 gauges, a rolling 24-h total at each reading) **once an hour** (FloodWatch reads it
every 10 min from its own server) and keeps 50 h of snapshots (about 90 KB each) on the server. The 2-day and 3-day
totals add the reading now, 24 h before and 48 h before, each within 90 min of its time, or the total is unknown
(never a smaller number). Only gauges with 50 mm or more are published. The rain card then says, for the nearest such
gauge within 10 km: "ฝนสะสมที่วัดได้ 3 วัน (72 ชม.): 410 มม. ที่…". Words only; no level rests on it yet (KI-039).

The history started at 20:28 UTC on 24 Oct: 2-day totals from about 20:30 UTC on 25 Oct, 3-day totals from 26 Oct.

**Frank suggestion to FloodWatch:** publish a per-gauge 24/48/72 h measured total from the readings it already
stores (e.g. `/api/rain_obs`). Then this collector stops calling ThaiWater at all, and both apps say the same number.

## 5. VPN rotation: no, and this project shouldn't have one

- **What FloodWatch has:** an OpenVPN sidecar as a *Thai egress* for public pages that block foreign IPs (BMA's and
  RID's hosts; FloodWatch's server is in Germany), opt-in per request; since D-127 it replaces *dead* relays with
  fresh Thai ones from VPN Gate's public list, each config rebuilt from an allow-list. Its own rules (GUIDELINES §5,
  D-014/D-016): public pages only, never credentials, verify HTTPS, and **"don't rotate relays or solve bot
  challenges to get past a block … never rotate proxies or otherwise get around blocks, bot challenges or rate
  limits"**.
- **This project:** the collector runs on `autobahn-bot`, which is in Germany too (Cloudflare's trace: `loc=DE`), and
  every source it reads answers from there (TMD, FIRMS, Air4Thai with the two public intermediates, ThaiWater,
  FloodWatch). The page's own sources are read by the visitor's phone, in Thailand. Nothing needs a Thai IP.
- **What it gets through FloodWatch:** BMA's and RID's gauges (201 and 676 rows) arrive in `floodwatch.json`. So
  FloodWatch's egress already serves the family once, and this project doesn't run a second one.
- **Don't add one.** The only limit this project has met is ThaiWater's per-IP rate limit (KI-029); rotating
  addresses to get past it would be exactly the evasion both projects' rules forbid. VPN Gate's relays are run by
  unknown volunteers, so a tunnel would put this project's traffic through hosts nobody vetted. If a source ever
  geo-blocks the collector, the rule is FloodWatch's D-014: ask the agency, or use a Thai host the owner controls.

## 6. What FloodWatch could change to help most (to the owner, B-list)

1. **A measured-rain endpoint** per gauge (24/48/72 h), §4.
2. **CORS on `/api/geocode`** for this origin (B2): street search through FloodWatch's cache, not Nominatim directly.
   `/api/point` is no longer needed: the collector's file gives the page the same gauges without a visitor's
   position leaving the phone.
3. **Freshness on the south's RID gauges:** X.44 and X.90 (Hat Yai) were 4.4 h old at 20:26 UTC, so neither app could
   judge Hat Yai city from them. HII's twins (SLA002 at X.90's site) were fresh.
4. **Its "upstream" group needs the downstream gauge at watch or warning.** For a city whose own gauge is late or
   normal while the hills fill (Hat Yai), an upstream line that doesn't wait for the downstream status would give
   hours more notice; whether it does without crying wolf is the lead-time study's question.
