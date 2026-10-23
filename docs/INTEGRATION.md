# Integration with the owner's other apps: frank suggestions

The owner has three apps that touch the same people on the same bad day. Built separately, they risk telling a family three different things. This page says what each should own, what was checked on 23 Oct 2026, and the small changes that would make them one service.

## 1. Who owns what

| App | Owns | Doesn't own |
|---|---|---|
| **FloodWatch** (`flood2026-research`, https://flood.autobahn.bot) | water: 1,409 gauges (`/api/stations`, 20:23 UTC), BMA's canals, 12–72 h level forecasts with their measured skill, the `/impact` reservoir cases | heat, dust, quakes; "what to do" |
| **บ้านรอดไหม** (`Hazard-huntz`, https://baanrodmai.autobahn.bot) | **what to do**: 9 sourced guides, the home kit, the family plan, calculators | live data (its N28 "around my home" is only proposed) |
| **Disaster Now** (this repo) | **what is happening at this point now and in 3 days, for every hazard**, in one page | detail (it links to FloodWatch) and advice beyond one sourced line (it links to บ้านรอดไหม) |

**Frank suggestion 1: don't build Hazard-huntz's N28 inside บ้านรอดไหม.** It is this app. Let บ้านรอดไหม's start screen link to Disaster Now ("ตอนนี้รอบบ้านเป็นอย่างไร"), and Disaster Now's tiles link back to its guides (they do: `assess.GUIDE`). One codebase for live data; one for advice.

## 2. What was checked (23 Oct 2026)

| Check | Result | Evidence |
|---|---|---|
| Gauge statuses: this app's rule on ThaiWater vs FloodWatch's `/api/stations`, same codes, fetched a minute apart | **691 of 693 agree (99.7 %)**; the 2 left are a different reading (ONE039, 0.43 vs 0.45 m at the 70 % edge) and a different bed level (TCP004) | `research/crosscheck_floodwatch.mjs`, `research/logs/crosscheck-floodwatch-2026-10-23.log` |
| The first run disagreed on 15 | ThaiWater writes `ground_level: 0` for "no river-bed level"; FloodWatch drops it (its collector's Python `or` treats 0 as missing); this app now does the same | same log, second run |
| The point check for Bangkok's old town | FloodWatch `/api/point` says area "normal"; this app's mirror of `point.area_index` says ยังรับน้ำได้ (normal), because in Bangkok and its five neighbours only canals judge a point | `test/more.test.mjs` "FloodWatch's point rule" |
| Measured rain at 13.75, 100.5 | the same gauge (ปากคลองตลาด) and amount (4.5 mm) as FloodWatch's point check, after adopting its 10 km / 3 h limits | `test/more.test.mjs` "assess on live fixtures" |
| Advice lines and bands vs บ้านรอดไหม | all 9 lines and both band sets equal, live and in the repository | `npm run check:advice` |
| The FloodWatch link from the flood card | carries the point rounded to 2 decimals (`#p=13.79,100.61`), never the GPS fix (0.2.0; the visitor audit's V10) | `test/audit.test.mjs` "V10/V15" |
| The mask line and the under-2 line, as บ้านรอดไหม pairs them (its F129) | the verdict and the dust card show both since 0.2.0 (the output audit's H1) | `test/audit.test.mjs` "H1" |
| Links to บ้านรอดไหม's guides (`/hot`, `/air`, `/storm`, `/flood`, `/landslide`, `/quake`, `/pm25`, `/mask`, `/en/…`) | all 200 | curl, 20:0x UTC |

## 3. Small changes in FloodWatch that would help most

1. **CORS on `/api/point` for this site's origin.** Then the flood tile shows FloodWatch's own answer, which includes BMA's canal gauges (this app sees only ThaiWater's 8 Bangkok gauges; FloodWatch had 33 near the old town). `/api/point` is already a private-query path (not logged). Turn it on in `public/config.json` with `"floodwatchPoint": true` once FloodWatch allows it.
2. **CORS on `/api/geocode`.** Nominatim's 1-request-a-second limit is for a whole application's users together; FloodWatch already throttles and caches to it and never logs queries (its D-032). Then set `"geocoder": "floodwatch"` in `public/config.json`.
3. **Run this app on FloodWatch's server** ([SERVER.md](SERVER.md): `docker compose up -d --build` puts the page on 127.0.0.1:8090 beside FloodWatch's 3000, with the collector every 15 minutes), and give it a public hostname on FloodWatch's tunnel. FloodWatch already fetches HII every 10 minutes; Hazard-huntz docs/09 recommended exactly this.
4. **A frank one about FloodWatch itself:** its bank rule counts "% of the height from the river bed to the bank". On a deep river that reads "ใกล้ล้นตลิ่ง" while the water is far below the bank: C.12 (Chao Phraya at Samsen) was "warning" at 92 % with **1.31 m** of freeboard on 24 Oct 02:00. FloodWatch marks the rule heuristic (its `classify_status` docstring). A freeboard rule for rivers (e.g. watch under 1.0 m, warning under 0.5 m, as FloodWatch's own `scenarios.py` uses for the impact strip) would read better to citizens. This app copies FloodWatch's rule for consistency; change both together.

## 4. Small changes in บ้านรอดไหม

1. **Link to Disaster Now** from the start screen and from each guide ("ตอนนี้ที่บ้านคุณ").
2. Its `public/_headers` sends `Permissions-Policy: geolocation=()`. Fine there, but don't let it be copied to this app's host.
3. Its `content/kit.json` already answers with CORS `*`: this app could read the advice lines from it at build time instead of keeping a copy; for now `npm run check:advice` catches drift.

## 5. One family, one look

- **The same four-level scale** in all three apps would help most: FloodWatch's blue/yellow/orange/red for normal/watch/warning/critical already matches this app's colours (#2F6FB0 / #E46C0A are FloodWatch's); บ้านรอดไหม uses agency colours per tool.
- **One name family** (e.g. "บ้านรอดไหม · ตอนนี้"), so a relative who trusts one trusts the others. The owner's call.
- **One "official channels" block** (TMD 1182, DDPM 1784, Cell Broadcast, LINE ALERT), the same words in all three.
