# Output cross-check: what the page shows vs the sources, fetched independently (23 Oct 2026, 20:35 UTC)

> Auditor 6's report (brief: [briefs-2026-10-23.md §6](briefs-2026-10-23.md#6-output-cross-check)). The auditor's tool refused to write report files, so the lead saved its returned report here unchanged, with §9 (every item, by point) appended from its results file. What was fixed because of it is in [HISTORY.md §5](HISTORY.md#5-forecast-validation-and-the-audits).

An independent audit of every number and word the page showed for six points, with each source re-fetched with curl within seconds and recomputed by the auditor's own code (Python, not the app's). It also checks the page against the owner's two other apps, FloodWatch and บ้านรอดไหม (Hazard-huntz). No repository file was edited.

**Verdict in one paragraph.** 292 of 308 items match the source after the page's own rounding (3 of the 292 are exact .5 ties that float summation decides). That covers every heat-index, rain, gust, CAMS, GISTDA, rain-gauge, river-gauge, quake, storm, hotspot, DMR and TMD-warning number. The source data are carried over faithfully. The **15 mismatches** come from five code paths, not from the sources:
1. **Air4Thai could not be read at all** (both of its hosts send the same broken certificate chain). The PM2.5 card then says "ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม." at four points that have a fresh PCD station 0.6–2.2 km away. In Bangkok this showed GISTDA's 45.9 (orange, "wear a mask") where the PCD measured 31.9 (yellow) 0.9 km away.
2. **At night the UV tile names the wrong day**: "พรุ่งนี้" at 03:35, 6 of 6 points.
3. **The flood tile reads calm with no gauge** within 8 km (Chiang Mai).
4. **The rain tile is milder than TMD's heavy-rain warning** (Hat Yai, Phuket).
5. **The "other pollution" card says no station is near** when one is (Bangkok, Ubon).

Against FloodWatch, every gauge status agrees: 15 of 15 near the points and 72 of 72 across the six provinces. However, the area category differs at 3 of 6 points (Chiang Mai, Hat Yai, Phuket): the page keeps a gauge for 6 h, FloodWatch for 3 h, and the page reads "no gauge" as calm. Against บ้านรอดไหม, the advice lines, sources, bands and links all match, with four exceptions. The most important is that the mask line is shown without บ้านรอดไหม's "children under 2 don't wear a mask" line.

---

## 1. Method

**Host and browser.**
- **Host:** a Claude Code cloud sandbox, with outbound HTTPS going through the session's egress proxy (its country was not determined).
- **Page:** served by `tools/serve.mjs` on http://127.0.0.1:8787/. It was already listening; a second copy failed with EADDRINUSE.
- **Browser:** headless Chromium 141 (`/opt/pw-browsers/chromium`) driven by `playwright-core` with `--no-sandbox`, at 390 × 844, locale `th-TH`, zone `Asia/Bangkok`, live sources, no mocks, real clock.
  - The proxy was given as Chromium flags (`--proxy-server`, `--proxy-bypass-list=127.0.0.1;localhost`). Playwright's own `proxy` option also sent 127.0.0.1 to the proxy, which answered 405.

**The six loads.** All six points were opened as `#p=lat,lon,name` in one tab, in order. Feeds that every point shares came from the page's own sessionStorage cache after the first point; they were still re-fetched independently for each point. Those feeds are HII's flash-flood report, USGS, GDACS, JMA, Air4Thai's mirror and the collector's files. The tiles, verdict, warnings, pre-warnings, cards, 3-day table, profile and footer were recorded in Thai and in English. Every external response the page received was saved.

**Code under test.**
- `public/js` was snapshotted at capture time, with a `sha256` list. All six loads ran the same code.
- The repository changed afterwards: at 20:4x UTC `assess.js` and `i18n.js` differ from the snapshot. The findings apply to the snapshot (`xcheck/code-at-capture/js`).
- **Replay check:** the app's own snapshot code, run in Node on the bodies the page received, reproduces every captured card value and line at all six points. The capture is therefore complete, and differences can be traced to code.

| What | UTC, 23 Oct 2026 |
|---|---|
| Collector files the page read (`public/data/live`: warnings, hotspots, TMD quakes, storms) | written 20:25:55–20:26:00; `air4thai.json` **failed (HTTP 503)** |
| Page loads (Bangkok, Chiang Mai, Hat Yai, Phuket, Ubon, Mae Sai) | 20:35:03, 20:35:20, 20:35:29, 20:36:06, 20:36:32, 20:36:45 (Bangkok time 03:35–03:36, 24 Oct) |
| Independent curl, same URLs as the page plus Air4Thai official and FloodWatch `/api/point` and `/api/stations` | 20:35:12–20:37:22, starting 6–17 s after each page load |
| Retries after proxy resets (`SSL_ERROR_SYSCALL`): air-quality at Hat Yai and Mae Sai, ensemble at Mae Sai (4th try) | 20:37:46–20:47:35; Mae Sai's ensemble came back with hourly arrays identical to the page's copy |
| The collector's own sources: TMD CAP RSS + its 3 newest items, TMD quake RSS, TMD StormTrack, FIRMS VIIRS S-NPP + NOAA-20 SE Asia 24 h | 20:43:17–20:43:37 |
| บ้านรอดไหม links (8 pages) | 20:50 |

**Fetch rules.**
- User-Agent `disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)`, gzip, verification always on.
- Air4Thai official (`air4thai.pcd.go.th/services/getNewAQI_JSON.php`) was read with `--cacert` set to `/root/.ccr/ca-bundle.crt` plus `tools/certs/*.crt`.
- No host got more than 6 calls per point from the page and the audit together: JMA at Bangkok 3 + 3; ThaiWater 4; DMR 4; FloodWatch 2; Open-Meteo ensemble at Mae Sai 1 + 4.
- `api.open-meteo.com` (elevation) was not called by the audit. The page's own call answered 429 at 4 points and 200 at Ubon and Mae Sai.

**Recomputation.** The auditor's own code is `scripts/recompute.py`. It shares no code with the app; the bands were typed from the sources in `docs/research/thresholds-2026-10-23.md`.
- **Distances and bearings:** haversine (R 6371.0088 km) and an 8-point compass.
- **Heat index:** the US NWS method (Steadman first; if the mean with T is ≥ 80 °F, Rothfusz plus the two NWS adjustments), on each of the 51 members' hourly T and RH. Then each member's peak over the 24 h from the current hour, numpy linear percentiles (p10, p50, p90), and the share of members at or above each band edge.
- **Rain and gusts:** per-member 24-h sum and maximum.
- **Day windows:** today's remaining hours, tomorrow and the day after, in Bangkok time.
- **CAMS:** the value at the current hour; UV as a whole-day maximum. The dust outlook is the daily mean × (GISTDA's 24 hours ÷ CAMS's same hours), clipped to 0.5–3.
- **PCD:** the nearest station within 15 km with a PM2.5 reading less than 3 h old.
- **Rain gauge:** within 10 km, read within 3 h.
- **River gauges:** FloodWatch's `classify_status` and `point.area_index` restated, with ThaiWater `ground_level` 0 = no bed. Fresh means read within 6 h, the page's own rule.
- **Felt intensity:** Allen, Wald & Worden 2012 (hypocentral), with the coefficients of thresholds §8.4.
- **Hotspots:** VIIRS, low confidence dropped, within 25 km.

**Match rule.** A ✅ means the value is equal after rounding the way the page does (half up, like JS `toFixed`). "✅ (.5 tie)" means the unrounded value is an exact .5, so the order of a float sum decides between, for example, 12 and 13. ⚠️ means a known approximation, not an error.

## 2. Results at a glance

| Point | Items | ✅ | ❌ | ⚠️ | The mismatches |
|---|---|---|---|---|---|
| Bangkok old town | 51 | 48 | 3 | 0 | UV tile day · "no PCD station" (PM2.5) · "no station nearby" (other pollution) |
| Chiang Mai | 54 | 50 | 3 | 1 | UV tile day · "no PCD station" · flood tile calm with no gauge ≤ 8 km (⚠️ subdistrict = nearest centroid) |
| Hat Yai | 52 | 50 | 2 | 0 | UV tile day · rain tile below TMD's Severe heavy-rain warning |
| Phuket | 50 | 48 | 2 | 0 | UV tile day · rain tile below TMD's Severe heavy-rain warning (2 rain rows are .5 ties) |
| Ubon Ratchathani | 50 | 47 | 3 | 0 | UV tile day · "no PCD station" · "no station nearby" (1 .5 tie) |
| Mae Sai | 51 | 49 | 2 | 0 | UV tile day · "no PCD station" |
| **All** | **308** | **292** | **15** | **1** | 5 causes, below |

The Thai and English pages carry the same numbers on every card. The only differences are formatting: the Thai year 2569 vs 2026, and "03:00," with a comma in English.

## 3. Every mismatch and its probable cause

### M1. "ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม." is false at 4 of 6 points: Air4Thai could not be read (❌ × 4)

| Point | The page showed (GISTDA's 24-h estimate) | PCD (Air4Thai, fetched independently) | The page's own code, fed the official response |
|---|---|---|---|
| Bangkok | **45.9 · เริ่มมีผลกระทบต่อสุขภาพ (orange)** · "ใส่หน้ากากกันฝุ่น PM2.5 ทุกครั้งที่ออกนอกบ้าน" (the verdict's headline and action too) · 3 days 26 / 12 / 21 | bkp92t สำนักงานเขตพระนคร, 0.9 km, 03:00: **31.9 · ปานกลาง (yellow)** | 31.9 ปานกลาง · "ออกกำลังหนักๆ นอกบ้านให้น้อยลง" · 3 days 18 / 9 / 14 · the verdict's headline becomes heat |
| Chiang Mai | 13.8 · ดีมาก (blue) · "ใช้ชีวิตได้ตามปกติ" | 36t โรงเรียนยุพราชวิทยาลัย, 0.6 km, 03:00: **15.5 · ดี (green)** | 15.5 ดี · "ทำกิจกรรมนอกบ้านได้ตามปกติ" · 13 / 14 / 15 |
| Ubon | 9.8 · ดีมาก | 83t ศูนย์ OTOP อุบลราชธานี, 2.2 km, 03:00: 11.4 · ดีมาก | same band · 7 / 7 / 10 |
| Mae Sai | 30.4 · ปานกลาง · 3 days 33 / 37 / **41**, plus a pre-warning "😷 ฝุ่นเริ่มมีผลต่อสุขภาพ · จ. 26" | 73t สำนักงานสาธารณสุขแม่สาย, 0.8 km, 03:00: 25.4 · ปานกลาง | same band · 27 / 31 / 34, so **no pre-warning** (34 < 37.6) |
| Hat Yai, Phuket | GISTDA (14.2, 15.7) | nearest stations 44t (1.7 km) and 43t (0.5 km) last read 21:00, 6.6 h old | the fallback and the "no station" line are right here ✅ |

The GISTDA ÷ PCD ratio at the four points was 1.44, 0.89, 0.86 and 1.20. The card's note "(24 ต.ค. 2569 สูงกว่าสถานีราว 1.3 เท่า)" fits Bangkok only.

**Cause.**
- **The certificate chain.** Both Air4Thai hosts present the same misconfigured chain: the leaf is `CN = air4thai.net`, issued by Let's Encrypt `YR1`, and the server sends a Sectigo/USERTrust chain instead of YR1 (`openssl s_client` through the proxy, about 20:39 UTC). The hosts are the page's CORS mirror `air4thai.com/forweb/getAQI_JSON.php` (`sources.js:35`) and `air4thai.pcd.go.th`.
  - Headless Chromium refused the mirror with `net::ERR_CERT_AUTHORITY_INVALID` on 6 of 6 loads. curl refused it with error 60. It works with the `tools/certs` bundle (`raw/a4t_mirror_with_bundle.body`, 17 KB, valid JSON).
  - This contradicts `docs/SOURCES.md` line 14 and KI-002 ("headless Chromium read it"). One possible reason: this sandbox's proxy relays only CONNECT, which may block Chromium's plain-HTTP fetch of the missing intermediate (AIA). Whether real phones read the mirror is **[unverified]**.
- **No collector copy.** The collector's `air4thai.json` failed with HTTP 503 at 20:26, so the page had no copy from there either.
- **The wording.** The page words the failure as a fact about the place. `assess.js:109` prints "ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม." whenever `station` is null. That includes when `bundle.a4t` is missing: `main.js:168–169` sets `bundle.errors.a4t`, but `assess()` never reads it there.

### M2. "ไม่มีสถานีวัดใกล้ ๆ" (other pollution) is false at 2 points (❌ × 2)

| Point | Page | PCD |
|---|---|---|
| Bangkok | CAMS values, no level ("ยังไม่มีข้อมูล") | bkp61t สำนักงาน สศช., 1.3 km: PM10 sub-index 34 → **AQI 34 · ดี** |
| Ubon | CAMS values | 83t, 2.2 km: PM10 12 → **AQI 12 · ดีมาก** |

The other four points have no fresh non-PM2.5 station within 15 km, so CAMS is the right fallback there. The CAMS numbers the page printed (PM10, O₃, NO₂, SO₂, CO at 03:00) equal the source at 6 of 6 points. **Cause:** the same as M1; `assess.js:151` states "no station nearby" when Air4Thai simply did not load.

### M3. The UV tile says "พรุ่งนี้สูงสุด N" at 03:35 Bangkok time: the next sunshine is today's (❌ × 6)

| Point | Tile | 25 Oct peak (CAMS) | 24 Oct peak (CAMS), what "the next daylight" is | The line under it |
|---|---|---|---|---|
| Bangkok | พรุ่งนี้สูงสุด 7 | 7.10 | 7.95 → **8** | "สูงสุดวันนี้ราว 8 (สูงมาก)" |
| Chiang Mai | 9 | 9.10 | 7.80 → **8** | "…วันนี้ราว 8" |
| Hat Yai | 9 | 8.75 | 9.80 → **10** | "…วันนี้ราว 10" |
| Phuket | 8 | 8.15 | 10.45 → **10** | "…วันนี้ราว 10" |
| Ubon | 9 | 8.85 | 8.30 → **8** | "…วันนี้ราว 8" |
| Mae Sai | 9 | 8.55 | 7.95 → **8** | "…วันนี้ราว 8" |

The tile and the line under it give two different peaks for "the next sun" on every point. **Cause:** `assess.js:171` shows `air.uv[1]` (tomorrow) for every night hour. Between 00:00 and 06:00 the next daylight is `air.uv[0]`. KI-017 covers the fixed 06–18 daylight window, not this.

### M4. The flood tile reads "ยังรับน้ำได้ · ยังไม่น่าห่วง" in Chiang Mai with no gauge within 8 km (❌ × 1)

The card itself says "ไม่มีสถานีวัดระดับน้ำที่ส่งข้อมูลในรัศมี 8 กม.".
- The tile's value, "ต่ำกว่าตลิ่ง 408 ซม.", is MOU010 สะพานห้วยแม่ตาช้าง, 13.0 km away on another stream.
- The Ping's own gauges (P.1 at 2.1 km, P.103) last read at 18:00, 9.6 h earlier.
- FloodWatch says, for the same point: area `null`, "ไม่มีสถานีวัดน้ำใกล้พอ ยังสรุประดับลำน้ำไม่ได้".

This breaks "missing data is never calm" (AGENTS §5). **Cause:** `assess.js:286` sets `c.level = ai.category ?? 0`, and `:312` sets `c.word = RIVER_WORDS[c.level]`.

### M5. The rain tile is milder than TMD's official heavy-rain warning (❌ × 2)

TMD CAP `CAPTMD20261023164718_2` ("พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย", **Severe**, until 08:00 24 Oct) covers TH-80, 81, 83, 84 and 90–96. At Hat Yai (TH-90) and Phuket (TH-83) the page shows the warning banner correctly ✅. Its rain tile, however, stays at "ฝนปานกลาง · ติดตามไว้" (level 1). The thresholds doc's rule 2 ("An official warning wins … at least as high as the mapping"; Severe → เตือนภัย) and AGENTS §5 ("the app's level is never milder than it") both put it at level 2. The verdict is level 2 anyway, because of heat. **Cause:** `assess.js` uses the warnings only in the verdict (`top = Math.max(…, ...warnings.map((w) => w.level))`); no card takes the CAP level.

### Approximations and notes, not errors

- ⚠️ **Chiang Mai's subdistrict.** The page names the nearest centroid, ต.พระสิงห์ (500102, 0.3 km away), worded "ใกล้". GISTDA's polygon lookup of the rounded point (18.79, 98.99) names ศรีภูมิ (500101). The DMR fault query and HII's list use 500102 (KI-006).
- **Three .5 ties.**
  - Phuket's 24-h rain median is exactly 12.5 mm and p90 is exactly 16.5; the page shows 12 and 16, where half-up rounding gives 13 and 17.
  - Ubon's p90 is exactly 1.5; the page shows 1.
  - JS sums the same floats in a different order. This is rounding only.
- **The storm lines are right but far.** "ไต้ฝุ่น จำปี ห่างราว 2,110–3,160 กม." (TMD) and "In-fa ห่างราว 6,710–7,490 กม." (JMA) are shown at every point. Both are correct (6 of 6 TMD lines, 6 of 6 JMA lines), but a typhoon 7,000 km away on a Thai home page is noise.
- **Mae Sai's gauge river label.** The gauge is labelled "(ลุ่มน้ำโขงเหนือ)": ThaiWater gives no `river_name`, so `water.js:60` falls back to the basin name. The gauge is on the Sai River.
  - Latent risk: inside the Bangkok polders, a gauge with only a basin name ("ลุ่มน้ำ…") gets the polder default "คลอง" from `waterWord()`, so a river gauge would be counted as a canal.
- **The Phuket wind word.** "ลมแรง" at Phuket is TMD's Beaufort-5 word (29–38 km/h) applied to a 30 km/h gust. It is correct for TMD's scale, but the tile doesn't say "gust" (KI-018).
- **EMSC region names in Thai text.** EMSC writes some region names in truncated upper-case English, for example "LAOS-VIETNAM-CAMBODIA BORDER REG", and the Thai quake lines print them as is. Where TMD has the quake, its Thai name wins (Mae Sai: "ประเทศลาว") ✅.
- **The FloodWatch link.** It carries the point at 4 decimals (`assess.js:270`, `lat.toFixed(4)`), roughly 10 m. For a GPS fix this sends the exact position off the phone when tapped, against the "rounded to ~1 km for providers" rule (AGENTS §5).

## 4. Consistency with FloodWatch (flood.autobahn.bot, fetched with each point)

| Point | FloodWatch `/api/point` area | The page's flood tile and area line | Same? | Why not |
|---|---|---|---|---|
| Bangkok | normal · medium · 33 gauges · nearest 0.4 km (BMA canal WL.BLP.02) | ยังรับน้ำได้ · from **1** gauge (AIT001 อโศก, 6.7 km) · ต่ำมาก | category ✅ · confidence ❌ | ThaiWater `waterlevel_load?province_code=10` returned 8 gauges and none of BMA's canal network (KI-007). Both apps rate C.12 and CPY015 "warning" (92–93 % of a 17–18 m channel, 1.2–1.3 m below the bank, KI-008), but FloodWatch's panel leads with its nearest river gauge WL.PKG.01 (normal, 1.73 m below the bank), while the page lists "ใกล้ล้นตลิ่ง" twice for the Chao Phraya |
| Chiang Mai | **none** ("ไม่มีสถานีวัดน้ำใกล้พอ…") | **ยังรับน้ำได้** (no gauge ≤ 8 km) | ❌ | M4 |
| Hat Yai | **none**: X.44 and X.174 (2.2 and 2.6 km) are stale for FloodWatch, read at 22:00, 5.6 h old | ยังรับน้ำได้ · 2 gauges · 2.2 km · ปานกลาง | ❌ | the page keeps gauges up to 6 h (`water.js:39`, `maxAgeH = 6`); FloodWatch up to 3 h (`api/__init__.py:54`, `STALE_MIN = 180`) |
| Phuket | **none**: X.190A (5.3 km, 5.6 h) and ridhydro_X.191 (16.6 h) stale | ยังรับน้ำได้ · 1 gauge · 5.3 km · ต่ำมาก | ❌ | the same 6 h vs 3 h rule |
| Ubon | normal · medium · 2 · 0.6 km | ยังรับน้ำได้ · 2 · 0.6 km · ปานกลาง | ✅ | — |
| Mae Sai | normal · medium · 2 · 1.8 km (MYA004, MYA002) | ยังรับน้ำได้ · 1 · 1.8 km · ต่ำ | category ✅ · confidence ❌ | MYA002 (2.2 km) is not in ThaiWater's province-57 list |

**Area category: 3 of 6 the same, 3 different.** The confidence is the same at only 1 of the 4 points where both apps give a category.

**Gauge statuses** (the page's rule on ThaiWater vs FloodWatch's served status for the same `tele_station_oldcode`):
- Within 20 km of the points: **15 of 15 the same**. Another 10 could not be compared: 5 are stale for both apps (P.1, P.103, P.81, P.21, MYA005), and 5 are fresh for the page but stale for FloodWatch (X.44, X.174, X.90, X.240, X.190A, all 3–6 h old).
- Every ThaiWater gauge in the six provinces: **72 of 72 the same**. 30 were older than 6 h, and 9 were unknown or stale on one side. Every bank and level was identical in both.
- The earlier 15 disagreements (KI-F01, ground 0) are gone.

**Measured rain:**
- The same gauge and the same millimetres at 6 of 6 points: RF.PNK.01, TH71, G09006-TA200304, 48564, G09006-TA054502 and MYA004 (0.0, 0.0, 0.0, 0.4, 0.0, 0.0 mm).
- FloodWatch's copy was one reading older at 4 of 6: 02:00 vs ThaiWater's 03:00 (Chiang Mai 01:50 vs 02:50). This is its collector's cycle, not a time-zone shift: FloodWatch parses `rainfall_datetime` as Bangkok time (`collectors/parsing.py:135`).

**Forecast rain words:** FloodWatch's own next-24 h rain and the page's ECMWF median fall in the **same TMD word at 6 of 6 points**:

| Point | FloodWatch (mm) | Page (mm) |
|---|---|---|
| Bangkok | 1.9 | 2 |
| Chiang Mai | 0.0 | 0 |
| Hat Yai | 21.6 | 14 |
| Phuket | 14.2 | 12 |
| Ubon | 0.6 | 1 |
| Mae Sai | 0.1 | 0 |

**Where the page's copy of `point.py` departs from FloodWatch.** None of these changed today's outcomes beyond the rows above.
- **Freshness:** 6 h vs 3 h.
- **The polder mode:** decided by the tambon's province code vs the nearest gauge's region.
- **FloodWatch's `water_word` fallbacks:** CPY* → แม่น้ำ, BKK*/BMA → คลอง.
- **Gauge coverage:** FloodWatch also has BMA, RID-hydro and FOP gauges that ThaiWater's province lists lack.

## 5. Consistency with บ้านรอดไหม (Hazard-huntz `public/content/kit.json` → air, hot; live site)

**What matches** (38 of 43 checks):
- **Advice lines:** 9 of 9 identical in Thai and English (5 PM2.5, 4 heat), each with the same source ids.
- **Sources:** 5 of 5 cited sources have the same URL as บ้านรอดไหม's `sources.json`.
- **Bands:** the PM2.5 edges (15.1 / 25.1 / 37.6 / 75.1 vs บ้านรอดไหม's ≤ 15 / 25 / 37.5 / 75), the AQI edges (26 / 51 / 101 / 201 vs ≤ 25 / 50 / 100 / 200) and the heat edges (27.0 / 33.0 / 42.0 / 52.0) are identical. So are the heat words in Thai (เฝ้าระวัง · เตือนภัย · อันตราย · อันตรายมาก).
- **Actions shown:** 12 of 12 actions the page showed equal บ้านรอดไหม's line for the value shown (6 PM2.5, 6 heat).
- **Links:** 8 of 8 guide links answer HTTP 200 and land on the matching page: `/hot`, `/air`, `/mask`, `/storm`, `/flood`, `/landslide`, `/quake`, `/pm25`.

**Mismatches:**
- **H1. The mask line goes out alone.** บ้านรอดไหม always follows a `mask: true` line with "เด็กต่ำกว่า 2 ขวบ ไม่ควรใส่หน้ากากทุกชนิด ให้อยู่ในห้องที่กันฝุ่นได้ และอย่าพาไปที่ฝุ่นเยอะ" (`kit.json` air `_readme`, v1.11.1, F129). The page shows "ใส่หน้ากากกันฝุ่น PM2.5 ทุกครั้งที่ออกนอกบ้าน" alone, on the Bangkok PM2.5 card and as the verdict's action (`actions.js` PM table, `assess.js:101`). This is the same blocker บ้านรอดไหม fixed in v1.11.1.
- **H2. The English heat words differ.** The page has "Caution · Extreme caution · Danger · Extreme danger" (`levels.js` heat, NWS words). บ้านรอดไหม and the thresholds doc have "Watch · Warning · Danger · Extreme danger".
- **H3. The PCD band words differ.** The page has "เริ่มมีผลกระทบต่อสุขภาพ / มีผลกระทบต่อสุขภาพ", the PCD notice's wording. บ้านรอดไหม has "เริ่มมีผลต่อสุขภาพ / มีผลต่อสุขภาพ", and so does the page's own pre-warning ("ฝุ่นเริ่มมีผลต่อสุขภาพ"). One page uses both forms.
- **H4. The rain card's link goes to a guide without rain** (found by a content check outside the 43). The link reads "พายุ ฝนหนัก ทำอย่างไร" and opens `/storm` ("พายุ ลมแรง ฟ้าผ่า"). That guide's 10 lines never mention heavy rain or flooding (0 hits for ฝนหนัก, ฝนตกหนัก and น้ำท่วม in `checklists.json` storm).
- **The Air4Thai side effect.** Had the PCD stations been read (M1), Bangkok would have received บ้านรอดไหม's yellow line instead of orange, and Chiang Mai green instead of blue. These are 2 of the 5 ❌ above.

## 6. Levels vs `levels.js` and the thresholds doc

The thresholds doc was read at about 20:30 UTC while another researcher may still have been writing it. The snapshot's `levels.js` follows its recommended scheme for:
- heat (named levels 1:1)
- PM2.5 and AQI (PCD)
- UV (WHO, 3–7 watch, the current value rather than the day's peak)
- rain (TMD words, one level below each class)
- gusts (TMD's Beaufort words, grouped 39 / 62 / 89)
- felt intensity (3.0 / 5.0 / 6.0)
- hotspots (≤ 10 km watch, ≤ 2 km get ready)
- landslide (> 100 mm in 24 h, DMR)
- tsunami (watch only)
- CAP severity → level

It departs from the doc in four places:
1. **CAP warnings don't lift their hazard's tile** (rule 2; see M5).
2. **Tropical-cyclone level by distance.** TMD's track counts as ≤ 300 km → 2 and ≤ 800 km → 1. The doc says "affecting" only from a TMD warning. No effect today, since every storm was 2,100 km or more away.
3. **Gust words on the tile.** The doc says the card must say "ลมกระโชก". The card line and the 3-day row do; the tile word doesn't.
4. **English heat words** (H2).

## 7. Verdict

The data pipeline is trustworthy. Every value taken from a source, and every quantity derived from one, equals an independent fetch and an independent computation made seconds later at six points across Thailand: ensemble heat-index percentiles, rain and gust spreads, CAMS, GISTDA, the CAMS correction, gauges, banks and freeboards, FloodWatch's statuses, quake distances and bearings, felt intensities, storm distances, hotspots, DMR layers and TMD warnings.

What is wrong is how the page words absent or old data, and three level rules. In order of harm:
1. **M1, Air4Thai.** It was unreadable at the time of this audit, and the failure is printed as "no PCD station within 15 km". In Bangkok the page told people to wear a mask on an estimate 1.4× the measurement 0.9 km away.
   - Fix the wording to "station data unavailable", and show the source error.
   - Make the collector's copy work (it answered 503) before relying on the mirror.
   - Re-test the mirror on real phones (KI-002 needs updating: not reproduced in headless Chromium here).
2. **H1, the mask line.** Add บ้านรอดไหม's under-2 line wherever the mask line shows.
3. **M4 and the freshness rule.** Make "no gauge" read as no data, and use FloodWatch's 3 h freshness, so the two apps say the same thing (Chiang Mai, Hat Yai, Phuket).
4. **M5.** Let a TMD CAP warning lift its hazard's tile.
5. **M3.** At night before 06:00, show today's UV peak.
6. **H2–H4.** Settle on one set of words, and send the rain card's link to a guide that covers heavy rain.

## 8. Files (scratchpad, not committed)

All were under the session scratchpad `xcheck/`: the capture and recomputation scripts (`scripts/capture.mjs`, `recompute.py`, `fw_compare.py`, `hh_compare.py`, `whatif_a4t.mjs`), the raw responses per point (`raw/<bkk|cnx|hdy|hkt|ubn|msi>/`: what the page received, the independent fetches, FloodWatch's point and stations, Air4Thai official, a screenshot, the code snapshot), the code that rendered all six loads (`code-at-capture/js/`, with sha256 sums), the collector's sources, and the results per point (`results/*.json`). The scripts and results are archived in `research/raw/output-crosscheck-2026-10-23.tar.gz`.

## 9. Every item, by point

Columns: the page's text · what the source says · the auditor's recomputation · match. Heat, rain and gust rows come from the 51-member ECMWF ensemble (Open-Meteo); "p50" is the median member.


### Bangkok old town (13.7563, 100.5018)

Page loaded 20:35:03 UTC (nearest subdistrict แขวงบวรนิเวศ เขตพระนคร กรุงเทพมหานคร, 100107); independent fetches 20:35:12–20:35:20 UTC. **48 ✅ · 3 ❌ · 0 ⚠️** of 51 items.

| Item | Page shows | Source says | My recomputation | Match | Note |
|---|---|---|---|---|---|
| Subdistrict (nearest centroid, HDX table) | ใกล้ แขวงบวรนิเวศ เขตพระนคร กรุงเทพมหานคร | GISTDA reverse lookup of the rounded point: บวรนิเวศ (100107) | แขวงบวรนิเวศ เขตพระนคร กรุงเทพมหานคร (100107, 0.2 km to centroid) | ✅ |  |
| Heat: value (median member's 24-h peak heat index) | 38 °C | 51 members, T & RH hourly | 38 °C (p50 = 37.83) | ✅ |  |
| Heat: band word | เตือนภัย | DOH/TMD 2024 bands | เตือนภัย | ✅ |  |
| Heat: range p10–p90 | 37–39 |  | 37–39 | ✅ |  |
| Heat: air temp peak p50 | 32 |  | 32 | ✅ |  |
| Heat: feels like now (median at this hour) | 27 | hour 2026-10-24T03:00 | 27 | ✅ |  |
| Heat: 3 days (p50 of daily peaks) | 38 39 38 |  | 38 39 38 | ✅ |  |
| Heat: chance ≥ 42 °C line | not shown |  | 0.00 → not shown | ✅ |  |
| Heat: tile level | warn |  | warn | ✅ |  |
| Heat: model time | 03:00 น. วันนี้ | hourly.time[3] = 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain fcst: 24-h median | 2 | 51 members, hourly precipitation summed | 2 (p50 = 2.4000) | ✅ |  |
| Rain fcst: range p10–p90 | 1–5 |  | 1–5 (1.2000–5.3000) | ✅ |  |
| Rain fcst: chance > 35 mm | ไม่ถึง 10% |  | 0.000 → ไม่ถึง 10% | ✅ |  |
| Rain fcst: TMD word (of the median) | ฝนเล็กน้อย | TMD เกณฑ์ปริมาณฝน | ฝนเล็กน้อย | ✅ |  |
| Rain fcst: 3 days (p50) in the table | 2 2 4 |  | 2 2 4 | ✅ |  |
| Gust: 24-h median of member peaks | 27 | 51 members wind_gusts_10m | 27 (p50 = 27.00) | ✅ |  |
| Gust: word (TMD Beaufort) | ลมปานกลาง | TMD เกณฑ์อากาศ p.2 | ลมปานกลาง | ✅ |  |
| Gust: range p10–p90 | 23–32 |  | 23–32 | ✅ |  |
| Gust: 3 days | 27 26 25 |  | 27 26 25 | ✅ |  |
| Other pollution (CAMS at this hour, µg/m³) | PM10 17 · O₃ 91 · NO₂ 18 · SO₂ 11 · CO 763 | CAMS hour 2026-10-24T03:00 | PM10 17 · O₃ 91 · NO₂ 18 · SO₂ 11 · CO 763 | ✅ |  |
| UV now | กลางคืน | CAMS uv_index at 2026-10-24T03:00 = 0.0 | กลางคืน | ✅ |  |
| UV tile value | พรุ่งนี้สูงสุด 7 | daily max: 2026-10-24 7.95, 2026-10-25 7.1, 2026-10-26 6.75 | next daylight is today (2026-10-24): peak 8 | ❌ | at 03:3x the next sun is today's, but the tile says 'tomorrow' (assess.js: c.value = day ? … : `พรุ่งนี้สูงสุด ${air.uv[1]?.max}`) |
| UV: today's peak line + word | สูงสุดวันนี้ราว 8 (สูงมาก) |  | สูงสุดวันนี้ราว 8 (สูงมาก) | ✅ |  |
| UV: 3 days | 8 7 7 |  | 8 7 7 | ✅ |  |
| PM2.5 (GISTDA 24-h estimate) | 45.9 | pm25Avg24hrs = 45.852; pm25 now = 31.49 | 45.9 (เริ่มมีผลกระทบต่อสุขภาพ) | ✅ |  |
| PM2.5 GISTDA time | 03:00 น. วันนี้ | last graph hour 2026-10-24T03:00 (Thai time per datetimeThai 'เวลา 3:00 น.') | 03:00 น. วันนี้ | ✅ |  |
| PM2.5 3 days (CAMS daily mean × GISTDA/CAMS ratio) | 26 12 21 | ratio over 24 h = 1.499 → 1.499 | 26 12 21 | ✅ |  |
| PM2.5 'no PCD station within 15 km' (claim) | ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม. | Air4Thai official: 173 stations; nearest bkp92t สำนักงานเขตพระนคร 0.9 km, 2026-10-24 03:00 | station bkp92t สำนักงานเขตพระนคร 0.9 km, 24-h mean 31.9 (ปานกลาง) at 2026-10-24 03:00 | ❌ | the page never got Air4Thai (air4thai.com: ERR_CERT_AUTHORITY_INVALID) and words the failure as 'no station' |
| Other pollution: PCD station (should lead) | CAMS values, 'ไม่มีสถานีวัดใกล้ ๆ' | bkp61t สำนักงานคณะกรรมการพัฒนาเศรษฐกิจและสังคมแห่งชาติ 1.3 km 2026-10-24 03:00: {'PM10': 34.0} | AQI 34 (PM10) → ดี | ❌ | Air4Thai unreadable in the page; the card says there is no station nearby |
| Rain measured (nearest gauge ≤ 10 km, ≤ 3 h) | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่สนข.พระนคร (ห่าง 1.0 กม.) | ThaiWater rain_24h RF.PNK.01 2026-10-24T03:00 | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่สนข.พระนคร (ห่าง 1.0 กม.) | ✅ |  |
| Rain gauge time | 03:00 น. วันนี้ | 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain tile level | ok |  | ok | ✅ |  |
| Gauge C.12 | กรมชลประทานสามเสน (แม่น้ำเจ้าพระยา) ห่าง 3.6 กม.: ต่ำกว่าตลิ่ง 131 ซม. · ใกล้ล้นตลิ่ง (แม่น้ำนอกแนวคัน ไม่ใช้ตัดสินจุดนี้) | ThaiWater 2026-10-24T01:00: level 0.95 m MSL, min_bank 2.26, ground -14.52, situation_level 4 | กรมชลประทานสามเสน (แม่น้ำเจ้าพระยา) ห่าง 3.6 กม.: ต่ำกว่าตลิ่ง 131 ซม. · ใกล้ล้นตลิ่ง (pct 92 %) | ✅ |  |
| Gauge CPY015 | สะพานกรุงเทพ (แม่น้ำเจ้าพระยา) ห่าง 6.3 กม.: ต่ำกว่าตลิ่ง 122 ซม. · ใกล้ล้นตลิ่ง (แม่น้ำนอกแนวคัน ไม่ใช้ตัดสินจุดนี้) | ThaiWater 2026-10-24T03:20: level 0.94 m MSL, min_bank 2.16, ground -15.697, situation_level 4 | สะพานกรุงเทพ (แม่น้ำเจ้าพระยา) ห่าง 6.3 กม.: ต่ำกว่าตลิ่ง 122 ซม. · ใกล้ล้นตลิ่ง (pct 93 %) | ✅ |  |
| Gauge AIT001 | อโศก (คลองแสนแสบ) ห่าง 6.7 กม.: ต่ำกว่าตลิ่ง 112 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T03:20: level 1.27 m MSL, min_bank 2.39, ground 0.5, situation_level 3 | อโศก (คลองแสนแสบ) ห่าง 6.7 กม.: ต่ำกว่าตลิ่ง 112 ซม. · ยังรับน้ำได้ (pct 41 %) | ✅ |  |
| Flood area category (FloodWatch rule on ThaiWater gauges) | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 1 สถานี ใกล้สุด 6.7 กม. · ความมั่นใจต่ำมาก) |  | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 1 สถานี ใกล้สุด 6.7 กม. · ความมั่นใจต่ำมาก) | ✅ |  |
| Flood tile value (basis gauge's freeboard) | ต่ำกว่าตลิ่ง 112 ซม. | AIT001 | ต่ำกว่าตลิ่ง 112 ซม. | ✅ |  |
| Flood source time (nearest fresh gauge) | 01:00 น. วันนี้ | 2026-10-24T01:00 | 01:00 น. วันนี้ | ✅ |  |
| HII flash-flood list | น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงของ สสน. คืนนี้ (0 ตำบลทั่วประเทศ) | 0 rows (header only) | not listed (0 ตำบลทั่วประเทศ) | ✅ |  |
| Quakes ≤ 300 km or MMI ≥ 3 in 7 days | none | EMSC 69, USGS 136, TMD 10 | none | ✅ |  |
| TMD storm CHAMPI | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,590 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,590 กม. | TMD StormTrack (fetched 2026-10-23T20:43:17Z): last obs 2026-10-23T18:00:00 24.8,122.3 ไต้ฝุ่น | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,590 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,590 กม. | ✅ |  |
| JMA storm Champi | not shown (TMD's track used) | JMA TC2636 TY | dropped (TMD carries it) | ✅ |  |
| JMA storm In-fa | พายุ In-fa อยู่ห่างราว 7,190 กม. วงคาดการณ์เข้าใกล้สุดราว 6,360 กม. ใน 120 ชม. | JMA TC2637 analysis [10.4, 166.7] | พายุ In-fa อยู่ห่างราว 7,190 กม. วงคาดการณ์เข้าใกล้สุดราว 6,360 กม. ใน 120 ชม. | ✅ |  |
| GDACS TC ≤ 1,000 km | ไม่มีพายุหมุนเขตร้อนในรัศมี 1,000 กม. | Tropical Cyclone VANCE-26 16,357 km | none within 1,000 km | ✅ |  |
| Hotspots ≤ 25 km (VIIRS, not low) | 0 จุด | collector file (20:25 UTC): 0 | my FIRMS fetch (20:43 UTC): 0 | ✅ |  |
| Fire tile level (app rule: nearest ≤ 10 km → watch, ≤ 2 km → warning) | ok |  | ok | ✅ |  |
| DMR landslide-risk villages ≤ 3 km | 0 (ไม่มีหมู่บ้านเสี่ยง…) | count = 0 | 0 | ✅ |  |
| DMR active-fault subdistrict | 〰️ ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง (รัศมี 20 กม.) ของกรมทรัพยากรธรณี | TB_CODE=100107: 0 feature(s)  | ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง | ✅ |  |
| Elevation | not shown | elevation API (page): HTTP 429/aborted | ensemble response's DEM elevation 7.0 | ✅ |  |
| TMD CAP warning for the province | none | no live item for TH-10 | none | ✅ |  |
| Verdict (highest tile or warning) | เตรียมตัว | tiles {'rain': 0, 'flood': 0, 'pm25': 2, 'heat': 2, 'quake': 0, 'fire': 0, 'wind': 0, 'uv': 0, 'landslide': 0, 'air': -1}, CAP -1 | เตรียมตัว | ✅ |  |

### Chiang Mai (18.7883, 98.9853)

Page loaded 20:35:20 UTC (nearest subdistrict ต.พระสิงห์ อ.เมืองเชียงใหม่ จ.เชียงใหม่, 500102); independent fetches 20:35:26–20:35:29 UTC. **50 ✅ · 3 ❌ · 1 ⚠️** of 54 items.

| Item | Page shows | Source says | My recomputation | Match | Note |
|---|---|---|---|---|---|
| Subdistrict (nearest centroid, HDX table) | ใกล้ ต.พระสิงห์ อ.เมืองเชียงใหม่ จ.เชียงใหม่ | GISTDA reverse lookup of the rounded point: ศรีภูมิ (500101) | ต.พระสิงห์ อ.เมืองเชียงใหม่ จ.เชียงใหม่ (500102, 0.3 km to centroid) | ⚠️ | page = nearest centroid (worded 'ใกล้'); GISTDA's polygon lookup (of 18.79, 98.99) names the neighbour |
| Heat: value (median member's 24-h peak heat index) | 36 °C | 51 members, T & RH hourly | 36 °C (p50 = 36.20) | ✅ |  |
| Heat: band word | เตือนภัย | DOH/TMD 2024 bands | เตือนภัย | ✅ |  |
| Heat: range p10–p90 | 36–37 |  | 36–37 | ✅ |  |
| Heat: air temp peak p50 | 33 |  | 33 | ✅ |  |
| Heat: feels like now (median at this hour) | 25 | hour 2026-10-24T03:00 | 25 | ✅ |  |
| Heat: 3 days (p50 of daily peaks) | 36 37 36 |  | 36 37 36 | ✅ |  |
| Heat: chance ≥ 42 °C line | not shown |  | 0.00 → not shown | ✅ |  |
| Heat: tile level | warn |  | warn | ✅ |  |
| Heat: model time | 03:00 น. วันนี้ | hourly.time[3] = 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain fcst: 24-h median | 0 | 51 members, hourly precipitation summed | 0 (p50 = 0.0000) | ✅ |  |
| Rain fcst: range p10–p90 | 0–0 |  | 0–0 (0.0000–0.0000) | ✅ |  |
| Rain fcst: chance > 35 mm | ไม่ถึง 10% |  | 0.000 → ไม่ถึง 10% | ✅ |  |
| Rain fcst: TMD word (of the median) | ไม่มีฝน | TMD เกณฑ์ปริมาณฝน | ไม่มีฝน | ✅ |  |
| Rain fcst: 3 days (p50) in the table | 0 0 4 |  | 0 0 4 | ✅ |  |
| Gust: 24-h median of member peaks | 18 | 51 members wind_gusts_10m | 18 (p50 = 18.40) | ✅ |  |
| Gust: word (TMD Beaufort) | ลมสงบถึงลมโชย | TMD เกณฑ์อากาศ p.2 | ลมสงบถึงลมโชย | ✅ |  |
| Gust: range p10–p90 | 17–21 |  | 17–21 | ✅ |  |
| Gust: 3 days | 18 19 23 |  | 18 19 23 | ✅ |  |
| Other pollution (CAMS at this hour, µg/m³) | PM10 16 · O₃ 14 · NO₂ 35 · SO₂ 7 · CO 1,773 | CAMS hour 2026-10-24T03:00 | PM10 16 · O₃ 14 · NO₂ 35 · SO₂ 7 · CO 1,773 | ✅ |  |
| UV now | กลางคืน | CAMS uv_index at 2026-10-24T03:00 = 0.0 | กลางคืน | ✅ |  |
| UV tile value | พรุ่งนี้สูงสุด 9 | daily max: 2026-10-24 7.8, 2026-10-25 9.1, 2026-10-26 6.95 | next daylight is today (2026-10-24): peak 8 | ❌ | at 03:3x the next sun is today's, but the tile says 'tomorrow' (assess.js: c.value = day ? … : `พรุ่งนี้สูงสุด ${air.uv[1]?.max}`) |
| UV: today's peak line + word | สูงสุดวันนี้ราว 8 (สูงมาก) |  | สูงสุดวันนี้ราว 8 (สูงมาก) | ✅ |  |
| UV: 3 days | 8 9 7 |  | 8 9 7 | ✅ |  |
| PM2.5 (GISTDA 24-h estimate) | 13.8 | pm25Avg24hrs = 13.818; pm25 now = 16.70 | 13.8 (ดีมาก) | ✅ |  |
| PM2.5 GISTDA time | 03:00 น. วันนี้ | last graph hour 2026-10-24T03:00 (Thai time per datetimeThai 'เวลา 3:00 น.') | 03:00 น. วันนี้ | ✅ |  |
| PM2.5 3 days (CAMS daily mean × GISTDA/CAMS ratio) | 11 13 14 | ratio over 24 h = 0.911 → 0.911 | 11 13 14 | ✅ |  |
| PM2.5 'no PCD station within 15 km' (claim) | ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม. | Air4Thai official: 173 stations; nearest 36t โรงเรียนยุพราชวิทยาลัย  0.6 km, 2026-10-24 03:00 | station 36t โรงเรียนยุพราชวิทยาลัย  0.6 km, 24-h mean 15.5 (ดี) at 2026-10-24 03:00 | ❌ | the page never got Air4Thai (air4thai.com: ERR_CERT_AUTHORITY_INVALID) and words the failure as 'no station' |
| Other pollution: PCD station | CAMS values | no fresh non-PM2.5 station ≤ 15 km | CAMS is the right fallback | ✅ |  |
| Rain measured (nearest gauge ≤ 10 km, ≤ 3 h) | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่ซุ้มเทศบาลหน้าวัดพระสิงห์วรมหาวิหาร (ห่าง 0.3 กม.) | ThaiWater rain_24h TH71 2026-10-24T02:50 | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่ซุ้มเทศบาลหน้าวัดพระสิงห์วรมหาวิหาร (ห่าง 0.3 กม.) | ✅ |  |
| Rain gauge time | 02:50 น. วันนี้ | 2026-10-24T02:50 | 02:50 น. วันนี้ | ✅ |  |
| Rain tile level | ok |  | ok | ✅ |  |
| Gauge MOU010 | สะพานห้วยแม่ตาช้าง (ห้วยแม่ท่าช้าง) ห่าง 13.0 กม.: ต่ำกว่าตลิ่ง 408 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T03:20: level 379.55 m MSL, min_bank 383.63, ground 377.753, situation_level 3 | สะพานห้วยแม่ตาช้าง (ห้วยแม่ท่าช้าง) ห่าง 13.0 กม.: ต่ำกว่าตลิ่ง 408 ซม. · ยังรับน้ำได้ (pct 31 %) | ✅ |  |
| Gauge TBW008 | ฝ่ายส่งน้ำและบำรุงรักษาที่ 2 (น้ำแม่ดู) ห่าง 14.7 กม.: ต่ำกว่าตลิ่ง 188 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T03:20: level 320.35 m MSL, min_bank 322.23, ground 318.75, situation_level 3 | ฝ่ายส่งน้ำและบำรุงรักษาที่ 2 (น้ำแม่ดู) ห่าง 14.7 กม.: ต่ำกว่าตลิ่ง 188 ซม. · ยังรับน้ำได้ (pct 46 %) | ✅ |  |
| Gauge MOU009 | สะพานน้ำแม่สา (น้ำแม่สา) ห่าง 19.9 กม.: ต่ำกว่าตลิ่ง 324 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T03:20: level 735.21 m MSL, min_bank 738.45, ground 735.21, situation_level 1 | สะพานน้ำแม่สา (น้ำแม่สา) ห่าง 19.9 กม.: ต่ำกว่าตลิ่ง 324 ซม. · ยังรับน้ำได้ (pct 0 %) | ✅ |  |
| Flood area line | ไม่มีสถานีวัดระดับน้ำที่ส่งข้อมูลในรัศมี 8 กม. |  | ไม่มีสถานีวัดระดับน้ำที่ส่งข้อมูลในรัศมี 8 กม. | ✅ |  |
| Flood tile word/level with NO gauge ≤ 8 km | ยังรับน้ำได้ · lv-ok |  | no area category: should read as unknown / no gauge, not calm | ❌ | assess.js: c.level = ai.category ?? 0 and c.word = RIVER_WORDS[c.level] → 'ยังรับน้ำได้' from no data (rule: missing data is never calm) |
| Flood tile value (basis gauge's freeboard) | ต่ำกว่าตลิ่ง 408 ซม. | MOU010 | ต่ำกว่าตลิ่ง 408 ซม. | ✅ |  |
| Flood source time (nearest fresh gauge) | 03:20 น. วันนี้ | 2026-10-24T03:20 | 03:20 น. วันนี้ | ✅ |  |
| HII flash-flood list | น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงของ สสน. คืนนี้ (0 ตำบลทั่วประเทศ) | 0 rows (header only) | not listed (0 ตำบลทั่วประเทศ) | ✅ |  |
| Quake line 1 | ขนาด 3.5 MYANMAR-CHINA BORDER REGION ห่าง 293 กม. ทางตะวันออกเฉียงเหนือ · 05:03 น. 23 ต.ค. · ไม่น่ารู้สึก | EMSC 2026-10-22T22:03:45Z 21.033,100.453 d10.0 | ขนาด 3.5 MYANMAR-CHINA BORDER REGION ห่าง 293 กม. ทางตะวันออกเฉียงเหนือ · 05:03 น. 23 ต.ค. · ไม่น่ารู้สึก (MMI -0.7) | ✅ |  |
| Quake line 2 | ขนาด 3.0 MYANMAR ห่าง 267 กม. ทางเหนือ · 04:19 น. 23 ต.ค. · ไม่น่ารู้สึก | EMSC 2026-10-22T21:19:35Z 21.17,99.336 d10.0 | ขนาด 3.0 MYANMAR ห่าง 267 กม. ทางเหนือ · 04:19 น. 23 ต.ค. · ไม่น่ารู้สึก (MMI -1.3) | ✅ |  |
| Quake line 3 | ขนาด 1.9 ต.เมืองนะ อ.เชียงดาว จ.เชียงใหม่ ห่าง 108 กม. ทางเหนือ · 16:39 น. 23 ต.ค. · ไม่น่ารู้สึก | TMD 2026-10-23T09:39:24Z 19.761,98.94 d10 | ขนาด 1.9 ต.เมืองนะ อ.เชียงดาว จ.เชียงใหม่ ห่าง 108 กม. ทางเหนือ · 16:39 น. 23 ต.ค. · ไม่น่ารู้สึก (MMI -1.7) | ✅ |  |
| TMD storm CHAMPI | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,490 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,490 กม. | TMD StormTrack (fetched 2026-10-23T20:43:17Z): last obs 2026-10-23T18:00:00 24.8,122.3 ไต้ฝุ่น | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,490 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,490 กม. | ✅ |  |
| JMA storm Champi | not shown (TMD's track used) | JMA TC2636 TY | dropped (TMD carries it) | ✅ |  |
| JMA storm In-fa | พายุ In-fa อยู่ห่างราว 7,310 กม. วงคาดการณ์เข้าใกล้สุดราว 6,420 กม. ใน 120 ชม. | JMA TC2637 analysis [10.4, 166.7] | พายุ In-fa อยู่ห่างราว 7,310 กม. วงคาดการณ์เข้าใกล้สุดราว 6,420 กม. ใน 120 ชม. | ✅ |  |
| GDACS TC ≤ 1,000 km | ไม่มีพายุหมุนเขตร้อนในรัศมี 1,000 กม. | Tropical Cyclone VANCE-26 16,034 km | none within 1,000 km | ✅ |  |
| Hotspots ≤ 25 km (VIIRS, not low) | 1 จุด, nearest 19.7 km | collector file (20:25 UTC): 1, nearest 19.7 km | my FIRMS fetch (20:43 UTC): 1, nearest 19.7 km | ✅ |  |
| Fire tile level (app rule: nearest ≤ 10 km → watch, ≤ 2 km → warning) | ok |  | ok | ✅ |  |
| DMR landslide-risk villages ≤ 3 km | 1 | count = 1 | 1 | ✅ |  |
| DMR active-fault subdistrict | 〰️ ตำบลนี้อยู่ในรัศมี 20 กม. จากรอยเลื่อนมีพลัง แม่ทา (กรมทรัพยากรธรณี) | TB_CODE=500102: 1 feature(s) แม่ทา | ตำบลนี้อยู่ในรัศมี 20 กม. จากรอยเลื่อนมีพลัง แม่ทา | ✅ |  |
| Elevation | not shown | elevation API (page): HTTP 429/aborted | ensemble response's DEM elevation 312.0 | ✅ |  |
| TMD CAP warning for the province | none | no live item for TH-50 | none | ✅ |  |
| Verdict (highest tile or warning) | เตรียมตัว | tiles {'rain': 0, 'flood': 0, 'pm25': 0, 'heat': 2, 'quake': 0, 'fire': 0, 'wind': 0, 'uv': 0, 'landslide': 0, 'air': -1}, CAP -1 | เตรียมตัว | ✅ |  |

### Hat Yai (7.0086, 100.4747)

Page loaded 20:35:29 UTC (nearest subdistrict ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา, 901101); independent fetches 20:35:35–20:36:06 UTC. **50 ✅ · 2 ❌ · 0 ⚠️** of 52 items.

| Item | Page shows | Source says | My recomputation | Match | Note |
|---|---|---|---|---|---|
| Subdistrict (nearest centroid, HDX table) | ใกล้ ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา | GISTDA reverse lookup of the rounded point: หาดใหญ่ (901101) | ต.หาดใหญ่ อ.หาดใหญ่ จ.สงขลา (901101, 0.8 km to centroid) | ✅ |  |
| Heat: value (median member's 24-h peak heat index) | 36 °C | 51 members, T & RH hourly | 36 °C (p50 = 36.31) | ✅ |  |
| Heat: band word | เตือนภัย | DOH/TMD 2024 bands | เตือนภัย | ✅ |  |
| Heat: range p10–p90 | 34–39 |  | 34–39 | ✅ |  |
| Heat: air temp peak p50 | 30 |  | 30 | ✅ |  |
| Heat: feels like now (median at this hour) | 26 | hour 2026-10-24T03:00 | 26 | ✅ |  |
| Heat: 3 days (p50 of daily peaks) | 36 35 34 |  | 36 35 34 | ✅ |  |
| Heat: chance ≥ 42 °C line | not shown |  | 0.00 → not shown | ✅ |  |
| Heat: tile level | warn |  | warn | ✅ |  |
| Heat: model time | 03:00 น. วันนี้ | hourly.time[3] = 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain fcst: 24-h median | 14 | 51 members, hourly precipitation summed | 14 (p50 = 13.6000) | ✅ |  |
| Rain fcst: range p10–p90 | 6–23 |  | 6–23 (6.4000–22.9000) | ✅ |  |
| Rain fcst: chance > 35 mm | ไม่ถึง 10% |  | 0.000 → ไม่ถึง 10% | ✅ |  |
| Rain fcst: TMD word (of the median) | ฝนปานกลาง | TMD เกณฑ์ปริมาณฝน | ฝนปานกลาง | ✅ |  |
| Rain fcst: 3 days (p50) in the table | 13 18 20 |  | 13 18 20 | ✅ |  |
| Gust: 24-h median of member peaks | 24 | 51 members wind_gusts_10m | 24 (p50 = 23.80) | ✅ |  |
| Gust: word (TMD Beaufort) | ลมปานกลาง | TMD เกณฑ์อากาศ p.2 | ลมปานกลาง | ✅ |  |
| Gust: range p10–p90 | 22–30 |  | 22–30 | ✅ |  |
| Gust: 3 days | 24 22 23 |  | 24 22 23 | ✅ |  |
| Other pollution (CAMS at this hour, µg/m³) | PM10 2 · O₃ 62 · NO₂ 4 · SO₂ 1 · CO 570 | CAMS hour 2026-10-24T03:00 | PM10 2 · O₃ 62 · NO₂ 4 · SO₂ 1 · CO 570 | ✅ |  |
| UV now | กลางคืน | CAMS uv_index at 2026-10-24T03:00 = 0.0 | กลางคืน | ✅ |  |
| UV tile value | พรุ่งนี้สูงสุด 9 | daily max: 2026-10-24 9.8, 2026-10-25 8.75, 2026-10-26 6.1 | next daylight is today (2026-10-24): peak 10 | ❌ | at 03:3x the next sun is today's, but the tile says 'tomorrow' (assess.js: c.value = day ? … : `พรุ่งนี้สูงสุด ${air.uv[1]?.max}`) |
| UV: today's peak line + word | สูงสุดวันนี้ราว 10 (สูงมาก) |  | สูงสุดวันนี้ราว 10 (สูงมาก) | ✅ |  |
| UV: 3 days | 10 9 6 |  | 10 9 6 | ✅ |  |
| PM2.5 (GISTDA 24-h estimate) | 14.2 | pm25Avg24hrs = 14.171; pm25 now = 13.10 | 14.2 (ดีมาก) | ✅ |  |
| PM2.5 GISTDA time | 03:00 น. วันนี้ | last graph hour 2026-10-24T03:00 (Thai time per datetimeThai 'เวลา 3:00 น.') | 03:00 น. วันนี้ | ✅ |  |
| PM2.5 3 days (CAMS daily mean × GISTDA/CAMS ratio) | 6 4 3 | ratio over 24 h = 2.578 → 2.578 | 6 4 3 | ✅ |  |
| PM2.5 'no PCD station within 15 km' (claim) | ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม. | Air4Thai official: 173 stations; nearest 44t เทศบาลนครหาดใหญ่  1.7 km, 2026-10-23 21:00 | no fresh station ≤ 15 km | ✅ |  |
| Other pollution: PCD station | CAMS values | no fresh non-PM2.5 station ≤ 15 km | CAMS is the right fallback | ✅ |  |
| Rain measured (nearest gauge ≤ 10 km, ≤ 3 h) | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่คลองอู่ตะเภาตอนล่าง (ห่าง 2.2 กม.) | ThaiWater rain_24h G09006-TA200304 2026-10-24T03:00 | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่คลองอู่ตะเภาตอนล่าง (ห่าง 2.2 กม.) | ✅ |  |
| Rain gauge time | 03:00 น. วันนี้ | 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain tile level | watch |  | watch | ✅ |  |
| Gauge X.44 | บ้านหาดใหญ่ใน (คลองอู่ตะเภา) ห่าง 2.2 กม.: ต่ำกว่าตลิ่ง 647 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-23T22:00: level 0.68 m MSL, min_bank 7.15, ground -2.204, situation_level 3 | บ้านหาดใหญ่ใน (คลองอู่ตะเภา) ห่าง 2.2 กม.: ต่ำกว่าตลิ่ง 647 ซม. · ยังรับน้ำได้ (pct 31 %) | ✅ |  |
| Gauge X.174 | บ้านคลองหวะ (คลองหวะ) ห่าง 2.6 กม.: ต่ำกว่าตลิ่ง 389 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-23T22:00: level 4.99 m MSL, min_bank 8.88, ground None, situation_level 3 | บ้านคลองหวะ (คลองหวะ) ห่าง 2.6 กม.: ต่ำกว่าตลิ่ง 389 ซม. · ยังรับน้ำได้ | ✅ |  |
| Gauge SLA007 | บางกล่ำ (คลองบางกล่ำ) ห่าง 9.4 กม.: ต่ำกว่าตลิ่ง 135 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T03:20: level 0.24 m MSL, min_bank 1.59, ground -1.739, situation_level 3 | บางกล่ำ (คลองบางกล่ำ) ห่าง 9.4 กม.: ต่ำกว่าตลิ่ง 135 ซม. · ยังรับน้ำได้ (pct 59 %) | ✅ |  |
| Flood area category (FloodWatch rule on ThaiWater gauges) | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 2 สถานี ใกล้สุด 2.2 กม. · ความมั่นใจปานกลาง) |  | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 2 สถานี ใกล้สุด 2.2 กม. · ความมั่นใจปานกลาง) | ✅ |  |
| Flood tile value (basis gauge's freeboard) | ต่ำกว่าตลิ่ง 647 ซม. | X.44 | ต่ำกว่าตลิ่ง 647 ซม. | ✅ |  |
| Flood source time (nearest fresh gauge) | 22:00 น. 23 ต.ค. | 2026-10-23T22:00 | 22:00 น. 23 ต.ค. | ✅ |  |
| HII flash-flood list | น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงของ สสน. คืนนี้ (0 ตำบลทั่วประเทศ) | 0 rows (header only) | not listed (0 ตำบลทั่วประเทศ) | ✅ |  |
| Quakes ≤ 300 km or MMI ≥ 3 in 7 days | none | EMSC 69, USGS 136, TMD 10 | none | ✅ |  |
| TMD storm CHAMPI | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 3,050 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 3,050 กม. | TMD StormTrack (fetched 2026-10-23T20:43:17Z): last obs 2026-10-23T18:00:00 24.8,122.3 ไต้ฝุ่น | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 3,050 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 3,050 กม. | ✅ |  |
| JMA storm Champi | not shown (TMD's track used) | JMA TC2636 TY | dropped (TMD carries it) | ✅ |  |
| JMA storm In-fa | พายุ In-fa อยู่ห่างราว 7,280 กม. วงคาดการณ์เข้าใกล้สุดราว 6,530 กม. ใน 120 ชม. | JMA TC2637 analysis [10.4, 166.7] | พายุ In-fa อยู่ห่างราว 7,280 กม. วงคาดการณ์เข้าใกล้สุดราว 6,530 กม. ใน 120 ชม. | ✅ |  |
| GDACS TC ≤ 1,000 km | ไม่มีพายุหมุนเขตร้อนในรัศมี 1,000 กม. | Tropical Cyclone VANCE-26 16,865 km | none within 1,000 km | ✅ |  |
| Hotspots ≤ 25 km (VIIRS, not low) | 0 จุด | collector file (20:25 UTC): 0 | my FIRMS fetch (20:43 UTC): 0 | ✅ |  |
| Fire tile level (app rule: nearest ≤ 10 km → watch, ≤ 2 km → warning) | ok |  | ok | ✅ |  |
| DMR landslide-risk villages ≤ 3 km | 0 (ไม่มีหมู่บ้านเสี่ยง…) | count = 0 | 0 | ✅ |  |
| DMR active-fault subdistrict | 〰️ ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง (รัศมี 20 กม.) ของกรมทรัพยากรธรณี | TB_CODE=901101: 0 feature(s)  | ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง | ✅ |  |
| Elevation | not shown | elevation API (page): HTTP 429/aborted | ensemble response's DEM elevation 13.0 | ✅ |  |
| TMD CAP warning for the province | พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย · ถึง 2026-10-24 08:00 | 1 live item(s) for TH-90: severity Severe | พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย · ถึง 2026-10-24 08:00 | ✅ |  |
| Rain tile vs TMD's heavy-rain warning for the province | ฝนปานกลาง · lv-watch | TMD CAP 'พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย' severity Severe | at least warn (Severe → เตือนภัย, thresholds doc rule 2) | ❌ | assess.js applies CAP warnings to the verdict only (top = max(tiles, warnings)); the rain tile stays at the model's level |
| Verdict (highest tile or warning) | เตรียมตัว | tiles {'rain': 1, 'flood': 0, 'pm25': 0, 'heat': 2, 'quake': 0, 'fire': 0, 'wind': 0, 'uv': 0, 'landslide': 0, 'air': -1}, CAP 2 | เตรียมตัว | ✅ |  |

### Phuket (7.8804, 98.3923)

Page loaded 20:36:06 UTC (nearest subdistrict ต.ตลาดใหญ่ อ.เมืองภูเก็ต จ.ภูเก็ต, 830101); independent fetches 20:36:23–20:36:32 UTC. **48 ✅ · 2 ❌ · 0 ⚠️** of 50 items.

| Item | Page shows | Source says | My recomputation | Match | Note |
|---|---|---|---|---|---|
| Subdistrict (nearest centroid, HDX table) | ใกล้ ต.ตลาดใหญ่ อ.เมืองภูเก็ต จ.ภูเก็ต | GISTDA reverse lookup of the rounded point: ตลาดใหญ่ (830101) | ต.ตลาดใหญ่ อ.เมืองภูเก็ต จ.ภูเก็ต (830101, 0.8 km to centroid) | ✅ |  |
| Heat: value (median member's 24-h peak heat index) | 33 °C | 51 members, T & RH hourly | 33 °C (p50 = 33.15) | ✅ |  |
| Heat: band word | เตือนภัย | DOH/TMD 2024 bands | เตือนภัย | ✅ |  |
| Heat: range p10–p90 | 32–34 |  | 32–34 | ✅ |  |
| Heat: air temp peak p50 | 29 |  | 29 | ✅ |  |
| Heat: feels like now (median at this hour) | 31 | hour 2026-10-24T03:00 | 31 | ✅ |  |
| Heat: 3 days (p50 of daily peaks) | 33 32 31 |  | 33 32 31 | ✅ |  |
| Heat: chance ≥ 42 °C line | not shown |  | 0.00 → not shown | ✅ |  |
| Heat: tile level | warn |  | warn | ✅ |  |
| Heat: model time | 03:00 น. วันนี้ | hourly.time[3] = 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain fcst: 24-h median | 12 | 51 members, hourly precipitation summed | 13 (p50 = 12.5000) | ✅ (.5 tie) | an exact .5: the float sum lands either side (rounding only) |
| Rain fcst: range p10–p90 | 8–16 |  | 8–17 (8.1000–16.5000) | ✅ (.5 tie) | an exact .5: rounding only |
| Rain fcst: chance > 35 mm | ไม่ถึง 10% |  | 0.000 → ไม่ถึง 10% | ✅ |  |
| Rain fcst: TMD word (of the median) | ฝนปานกลาง | TMD เกณฑ์ปริมาณฝน | ฝนปานกลาง | ✅ |  |
| Rain fcst: 3 days (p50) in the table | 10 16 16 |  | 10 16 16 | ✅ |  |
| Gust: 24-h median of member peaks | 30 | 51 members wind_gusts_10m | 30 (p50 = 29.90) | ✅ |  |
| Gust: word (TMD Beaufort) | ลมแรง | TMD เกณฑ์อากาศ p.2 | ลมแรง | ✅ |  |
| Gust: range p10–p90 | 24–34 |  | 24–34 | ✅ |  |
| Gust: 3 days | 30 26 23 |  | 30 26 23 | ✅ |  |
| Other pollution (CAMS at this hour, µg/m³) | PM10 3 · O₃ 53 · NO₂ 3 · SO₂ 1 · CO 433 | CAMS hour 2026-10-24T03:00 | PM10 3 · O₃ 53 · NO₂ 3 · SO₂ 1 · CO 433 | ✅ |  |
| UV now | กลางคืน | CAMS uv_index at 2026-10-24T03:00 = 0.0 | กลางคืน | ✅ |  |
| UV tile value | พรุ่งนี้สูงสุด 8 | daily max: 2026-10-24 10.45, 2026-10-25 8.15, 2026-10-26 7.1 | next daylight is today (2026-10-24): peak 10 | ❌ | at 03:3x the next sun is today's, but the tile says 'tomorrow' (assess.js: c.value = day ? … : `พรุ่งนี้สูงสุด ${air.uv[1]?.max}`) |
| UV: today's peak line + word | สูงสุดวันนี้ราว 10 (สูงมาก) |  | สูงสุดวันนี้ราว 10 (สูงมาก) | ✅ |  |
| UV: 3 days | 10 8 7 |  | 10 8 7 | ✅ |  |
| PM2.5 (GISTDA 24-h estimate) | 15.7 | pm25Avg24hrs = 15.730; pm25 now = 12.45 | 15.7 (ดี) | ✅ |  |
| PM2.5 GISTDA time | 03:00 น. วันนี้ | last graph hour 2026-10-24T03:00 (Thai time per datetimeThai 'เวลา 3:00 น.') | 03:00 น. วันนี้ | ✅ |  |
| PM2.5 3 days (CAMS daily mean × GISTDA/CAMS ratio) | 5 4 5 | ratio over 24 h = 4.046 → 3.000 | 5 4 5 | ✅ |  |
| PM2.5 'no PCD station within 15 km' (claim) | ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม. | Air4Thai official: 173 stations; nearest 43t ศูนย์บริการสาธารณสุขเทศบาลภูเก็ต 0.5 km, 2026-10-23 21:00 | no fresh station ≤ 15 km | ✅ |  |
| Other pollution: PCD station | CAMS values | no fresh non-PM2.5 station ≤ 15 km | CAMS is the right fallback | ✅ |  |
| Rain measured (nearest gauge ≤ 10 km, ≤ 3 h) | วัดได้ 0.4 มม. ใน 24 ชม. ที่ผ่านมา ที่ภูเก็ต (ห่าง 0.9 กม.) | ThaiWater rain_24h 48564 2026-10-24T01:00 | วัดได้ 0.4 มม. ใน 24 ชม. ที่ผ่านมา ที่ภูเก็ต (ห่าง 0.9 กม.) | ✅ |  |
| Rain gauge time | 01:00 น. วันนี้ | 2026-10-24T01:00 | 01:00 น. วันนี้ | ✅ |  |
| Rain tile level | watch |  | watch | ✅ |  |
| Gauge X.190A | บ้านเก็ตโฮ่ (คลองเก็ตโฮ) ห่าง 5.3 กม.: ต่ำกว่าตลิ่ง 208 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-23T22:00: level 15.05 m MSL, min_bank 17.13, ground 13.967, situation_level 3 | บ้านเก็ตโฮ่ (คลองเก็ตโฮ) ห่าง 5.3 กม.: ต่ำกว่าตลิ่ง 208 ซม. · ยังรับน้ำได้ (pct 34 %) | ✅ |  |
| Flood area category (FloodWatch rule on ThaiWater gauges) | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 1 สถานี ใกล้สุด 5.3 กม. · ความมั่นใจต่ำมาก) |  | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 1 สถานี ใกล้สุด 5.3 กม. · ความมั่นใจต่ำมาก) | ✅ |  |
| Flood tile value (basis gauge's freeboard) | ต่ำกว่าตลิ่ง 208 ซม. | X.190A | ต่ำกว่าตลิ่ง 208 ซม. | ✅ |  |
| Flood source time (nearest fresh gauge) | 22:00 น. 23 ต.ค. | 2026-10-23T22:00 | 22:00 น. 23 ต.ค. | ✅ |  |
| HII flash-flood list | น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงของ สสน. คืนนี้ (0 ตำบลทั่วประเทศ) | 0 rows (header only) | not listed (0 ตำบลทั่วประเทศ) | ✅ |  |
| Quakes ≤ 300 km or MMI ≥ 3 in 7 days | none | EMSC 69, USGS 136, TMD 10 | none | ✅ |  |
| TMD storm CHAMPI | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 3,160 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 3,160 กม. | TMD StormTrack (fetched 2026-10-23T20:43:17Z): last obs 2026-10-23T18:00:00 24.8,122.3 ไต้ฝุ่น | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 3,160 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 3,160 กม. | ✅ |  |
| JMA storm Champi | not shown (TMD's track used) | JMA TC2636 TY | dropped (TMD carries it) | ✅ |  |
| JMA storm In-fa | พายุ In-fa อยู่ห่างราว 7,490 กม. วงคาดการณ์เข้าใกล้สุดราว 6,730 กม. ใน 120 ชม. | JMA TC2637 analysis [10.4, 166.7] | พายุ In-fa อยู่ห่างราว 7,490 กม. วงคาดการณ์เข้าใกล้สุดราว 6,730 กม. ใน 120 ชม. | ✅ |  |
| GDACS TC ≤ 1,000 km | ไม่มีพายุหมุนเขตร้อนในรัศมี 1,000 กม. | Tropical Cyclone VANCE-26 16,978 km | none within 1,000 km | ✅ |  |
| Hotspots ≤ 25 km (VIIRS, not low) | 0 จุด | collector file (20:25 UTC): 0 | my FIRMS fetch (20:43 UTC): 0 | ✅ |  |
| Fire tile level (app rule: nearest ≤ 10 km → watch, ≤ 2 km → warning) | ok |  | ok | ✅ |  |
| DMR landslide-risk villages ≤ 3 km | 0 (ไม่มีหมู่บ้านเสี่ยง…) | count = 0 | 0 | ✅ |  |
| DMR active-fault subdistrict | 〰️ ตำบลนี้อยู่ในรัศมี 20 กม. จากรอยเลื่อนมีพลัง คลองมะรุ่ย (กรมทรัพยากรธรณี) | TB_CODE=830101: 1 feature(s) คลองมะรุ่ย | ตำบลนี้อยู่ในรัศมี 20 กม. จากรอยเลื่อนมีพลัง คลองมะรุ่ย | ✅ |  |
| Elevation | not shown | elevation API (page): HTTP 429/aborted | ensemble response's DEM elevation 4.0 | ✅ |  |
| TMD CAP warning for the province | พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย · ถึง 2026-10-24 08:00 | 1 live item(s) for TH-83: severity Severe | พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย · ถึง 2026-10-24 08:00 | ✅ |  |
| Rain tile vs TMD's heavy-rain warning for the province | ฝนปานกลาง · lv-watch | TMD CAP 'พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย' severity Severe | at least warn (Severe → เตือนภัย, thresholds doc rule 2) | ❌ | assess.js applies CAP warnings to the verdict only (top = max(tiles, warnings)); the rain tile stays at the model's level |
| Verdict (highest tile or warning) | เตรียมตัว | tiles {'rain': 1, 'flood': 0, 'pm25': 0, 'heat': 2, 'quake': 0, 'fire': 0, 'wind': 0, 'uv': 0, 'landslide': 0, 'air': -1}, CAP 2 | เตรียมตัว | ✅ |  |

### Ubon Ratchathani (15.2287, 104.8564)

Page loaded 20:36:32 UTC (nearest subdistrict ต.ในเมือง อ.เมืองอุบลราชธานี จ.อุบลราชธานี, 340101); independent fetches 20:36:38–20:36:45 UTC. **47 ✅ · 3 ❌ · 0 ⚠️** of 50 items.

| Item | Page shows | Source says | My recomputation | Match | Note |
|---|---|---|---|---|---|
| Subdistrict (nearest centroid, HDX table) | ใกล้ ต.ในเมือง อ.เมืองอุบลราชธานี จ.อุบลราชธานี | GISTDA reverse lookup of the rounded point: ในเมือง (340101) | ต.ในเมือง อ.เมืองอุบลราชธานี จ.อุบลราชธานี (340101, 2.1 km to centroid) | ✅ |  |
| Heat: value (median member's 24-h peak heat index) | 37 °C | 51 members, T & RH hourly | 37 °C (p50 = 37.16) | ✅ |  |
| Heat: band word | เตือนภัย | DOH/TMD 2024 bands | เตือนภัย | ✅ |  |
| Heat: range p10–p90 | 37–38 |  | 37–38 | ✅ |  |
| Heat: air temp peak p50 | 32 |  | 32 | ✅ |  |
| Heat: feels like now (median at this hour) | 26 | hour 2026-10-24T03:00 | 26 | ✅ |  |
| Heat: 3 days (p50 of daily peaks) | 37 37 36 |  | 37 37 36 | ✅ |  |
| Heat: chance ≥ 42 °C line | not shown |  | 0.00 → not shown | ✅ |  |
| Heat: tile level | warn |  | warn | ✅ |  |
| Heat: model time | 03:00 น. วันนี้ | hourly.time[3] = 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain fcst: 24-h median | 1 | 51 members, hourly precipitation summed | 1 (p50 = 0.6000) | ✅ |  |
| Rain fcst: range p10–p90 | 0–1 |  | 0–2 (0.0000–1.5000) | ✅ (.5 tie) | an exact .5: rounding only |
| Rain fcst: chance > 35 mm | ไม่ถึง 10% |  | 0.000 → ไม่ถึง 10% | ✅ |  |
| Rain fcst: TMD word (of the median) | ฝนเล็กน้อย | TMD เกณฑ์ปริมาณฝน | ฝนเล็กน้อย | ✅ |  |
| Rain fcst: 3 days (p50) in the table | 1 2 6 |  | 1 2 6 | ✅ |  |
| Gust: 24-h median of member peaks | 17 | 51 members wind_gusts_10m | 17 (p50 = 17.30) | ✅ |  |
| Gust: word (TMD Beaufort) | ลมสงบถึงลมโชย | TMD เกณฑ์อากาศ p.2 | ลมสงบถึงลมโชย | ✅ |  |
| Gust: range p10–p90 | 16–20 |  | 16–20 | ✅ |  |
| Gust: 3 days | 17 18 21 |  | 17 18 21 | ✅ |  |
| Other pollution (CAMS at this hour, µg/m³) | PM10 5 · O₃ 46 · NO₂ 10 · SO₂ 3 · CO 296 | CAMS hour 2026-10-24T03:00 | PM10 5 · O₃ 46 · NO₂ 10 · SO₂ 3 · CO 296 | ✅ |  |
| UV now | กลางคืน | CAMS uv_index at 2026-10-24T03:00 = 0.0 | กลางคืน | ✅ |  |
| UV tile value | พรุ่งนี้สูงสุด 9 | daily max: 2026-10-24 8.3, 2026-10-25 8.85, 2026-10-26 7.65 | next daylight is today (2026-10-24): peak 8 | ❌ | at 03:3x the next sun is today's, but the tile says 'tomorrow' (assess.js: c.value = day ? … : `พรุ่งนี้สูงสุด ${air.uv[1]?.max}`) |
| UV: today's peak line + word | สูงสุดวันนี้ราว 8 (สูงมาก) |  | สูงสุดวันนี้ราว 8 (สูงมาก) | ✅ |  |
| UV: 3 days | 8 9 8 |  | 8 9 8 | ✅ |  |
| PM2.5 (GISTDA 24-h estimate) | 9.8 | pm25Avg24hrs = 9.799; pm25 now = 12.11 | 9.8 (ดีมาก) | ✅ |  |
| PM2.5 GISTDA time | 03:00 น. วันนี้ | last graph hour 2026-10-24T03:00 (Thai time per datetimeThai 'เวลา 3:00 น.') | 03:00 น. วันนี้ | ✅ |  |
| PM2.5 3 days (CAMS daily mean × GISTDA/CAMS ratio) | 6 6 8 | ratio over 24 h = 1.166 → 1.166 | 6 6 8 | ✅ |  |
| PM2.5 'no PCD station within 15 km' (claim) | ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม. | Air4Thai official: 173 stations; nearest 83t ศูนย์แสดงและจำหน่ายสินค้า OTOP จังหวัดอุบลราชธานี 2.2 km, 2026-10-24 03:00 | station 83t ศูนย์แสดงและจำหน่ายสินค้า OTOP จังหวัดอุบลราชธานี 2.2 km, 24-h mean 11.4 (ดีมาก) at 2026-10-24 03:00 | ❌ | the page never got Air4Thai (air4thai.com: ERR_CERT_AUTHORITY_INVALID) and words the failure as 'no station' |
| Other pollution: PCD station (should lead) | CAMS values, 'ไม่มีสถานีวัดใกล้ ๆ' | 83t ศูนย์แสดงและจำหน่ายสินค้า OTOP จังหวัดอุบลราชธานี 2.2 km 2026-10-24 03:00: {'PM10': 12.0} | AQI 12 (PM10) → ดีมาก | ❌ | Air4Thai unreadable in the page; the card says there is no station nearby |
| Rain measured (nearest gauge ≤ 10 km, ≤ 3 h) | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่อุบลราชธานี (ห่าง 0.6 กม.) | ThaiWater rain_24h G09006-TA054502 2026-10-24T03:00 | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่อุบลราชธานี (ห่าง 0.6 กม.) | ✅ |  |
| Rain gauge time | 03:00 น. วันนี้ | 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain tile level | ok |  | ok | ✅ |  |
| Gauge PMTS16 | แม่น้ำมูล เมืองอุบลราชธานี (M.7) (แม่น้ำมูล) ห่าง 0.6 กม.: ต่ำกว่าตลิ่ง 540 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T03:00: level 108.44 m MSL, min_bank 113.84, ground 101.79, situation_level 3 | แม่น้ำมูล เมืองอุบลราชธานี (M.7) (แม่น้ำมูล) ห่าง 0.6 กม.: ต่ำกว่าตลิ่ง 540 ซม. · ยังรับน้ำได้ (pct 55 %) | ✅ |  |
| Gauge M.7 | สะพานเสรีประชาธิปไตย (แม่น้ำมูล) ห่าง 0.7 กม.: ต่ำกว่าตลิ่ง 354 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T02:00: level 108.46 m MSL, min_bank 112.0, ground 100.42, situation_level 3 | สะพานเสรีประชาธิปไตย (แม่น้ำมูล) ห่าง 0.7 กม.: ต่ำกว่าตลิ่ง 354 ซม. · ยังรับน้ำได้ (pct 69 %) | ✅ |  |
| Flood area category (FloodWatch rule on ThaiWater gauges) | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 2 สถานี ใกล้สุด 0.6 กม. · ความมั่นใจปานกลาง) |  | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 2 สถานี ใกล้สุด 0.6 กม. · ความมั่นใจปานกลาง) | ✅ |  |
| Flood tile value (basis gauge's freeboard) | ต่ำกว่าตลิ่ง 540 ซม. | PMTS16 | ต่ำกว่าตลิ่ง 540 ซม. | ✅ |  |
| Flood source time (nearest fresh gauge) | 03:00 น. วันนี้ | 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| HII flash-flood list | น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงของ สสน. คืนนี้ (0 ตำบลทั่วประเทศ) | 0 rows (header only) | not listed (0 ตำบลทั่วประเทศ) | ✅ |  |
| Quake line 1 | ขนาด 3.8 LAOS-VIETNAM-CAMBODIA BORDER REG ห่าง 290 กม. ทางตะวันออก · 06:04 น. 20 ต.ค. · ไม่น่ารู้สึก | EMSC 2026-10-19T23:04:16Z 14.998,107.543 d10.0 | ขนาด 3.8 LAOS-VIETNAM-CAMBODIA BORDER REG ห่าง 290 กม. ทางตะวันออก · 06:04 น. 20 ต.ค. · ไม่น่ารู้สึก (MMI -0.3) | ✅ |  |
| TMD storm CHAMPI | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,110 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,110 กม. | TMD StormTrack (fetched 2026-10-23T20:43:17Z): last obs 2026-10-23T18:00:00 24.8,122.3 ไต้ฝุ่น | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,110 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,110 กม. | ✅ |  |
| JMA storm Champi | not shown (TMD's track used) | JMA TC2636 TY | dropped (TMD carries it) | ✅ |  |
| JMA storm In-fa | พายุ In-fa อยู่ห่างราว 6,710 กม. วงคาดการณ์เข้าใกล้สุดราว 5,870 กม. ใน 120 ชม. | JMA TC2637 analysis [10.4, 166.7] | พายุ In-fa อยู่ห่างราว 6,710 กม. วงคาดการณ์เข้าใกล้สุดราว 5,870 กม. ใน 120 ชม. | ✅ |  |
| GDACS TC ≤ 1,000 km | ไม่มีพายุหมุนเขตร้อนในรัศมี 1,000 กม. | Tropical Cyclone VANCE-26 15,908 km | none within 1,000 km | ✅ |  |
| Hotspots ≤ 25 km (VIIRS, not low) | 0 จุด | collector file (20:25 UTC): 0 | my FIRMS fetch (20:43 UTC): 0 | ✅ |  |
| Fire tile level (app rule: nearest ≤ 10 km → watch, ≤ 2 km → warning) | ok |  | ok | ✅ |  |
| DMR landslide-risk villages ≤ 3 km | 0 (ไม่มีหมู่บ้านเสี่ยง…) | count = 0 | 0 | ✅ |  |
| DMR active-fault subdistrict | 〰️ ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง (รัศมี 20 กม.) ของกรมทรัพยากรธรณี | TB_CODE=340101: 0 feature(s)  | ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง | ✅ |  |
| Elevation | 124 | elevation API (page): 124.0 | ensemble response's DEM elevation 124.0 | ✅ |  |
| TMD CAP warning for the province | none | no live item for TH-34 | none | ✅ |  |
| Verdict (highest tile or warning) | เตรียมตัว | tiles {'rain': 0, 'flood': 0, 'pm25': 0, 'heat': 2, 'quake': 0, 'fire': 0, 'wind': 0, 'uv': 0, 'landslide': 0, 'air': -1}, CAP -1 | เตรียมตัว | ✅ |  |

### Mae Sai (20.4285, 99.8765)

Page loaded 20:36:45 UTC (nearest subdistrict ต.เวียงพางคำ อ.แม่สาย จ.เชียงราย, 570906); independent fetches 20:36:51–20:37:22 UTC. **49 ✅ · 2 ❌ · 0 ⚠️** of 51 items.

| Item | Page shows | Source says | My recomputation | Match | Note |
|---|---|---|---|---|---|
| Subdistrict (nearest centroid, HDX table) | ใกล้ ต.เวียงพางคำ อ.แม่สาย จ.เชียงราย | GISTDA reverse lookup of the rounded point: เวียงพางคำ (570906) | ต.เวียงพางคำ อ.แม่สาย จ.เชียงราย (570906, 2.3 km to centroid) | ✅ |  |
| Heat: value (median member's 24-h peak heat index) | 36 °C | 51 members, T & RH hourly | 36 °C (p50 = 35.71) | ✅ |  |
| Heat: band word | เตือนภัย | DOH/TMD 2024 bands | เตือนภัย | ✅ |  |
| Heat: range p10–p90 | 35–36 |  | 35–36 | ✅ |  |
| Heat: air temp peak p50 | 31 |  | 31 | ✅ |  |
| Heat: feels like now (median at this hour) | 25 | hour 2026-10-24T03:00 | 25 | ✅ |  |
| Heat: 3 days (p50 of daily peaks) | 36 36 36 |  | 36 36 36 | ✅ |  |
| Heat: chance ≥ 42 °C line | not shown |  | 0.00 → not shown | ✅ |  |
| Heat: tile level | warn |  | warn | ✅ |  |
| Heat: model time | 03:00 น. วันนี้ | hourly.time[3] = 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain fcst: 24-h median | 0 | 51 members, hourly precipitation summed | 0 (p50 = 0.0000) | ✅ |  |
| Rain fcst: range p10–p90 | 0–0 |  | 0–0 (0.0000–0.3000) | ✅ |  |
| Rain fcst: chance > 35 mm | ไม่ถึง 10% |  | 0.000 → ไม่ถึง 10% | ✅ |  |
| Rain fcst: TMD word (of the median) | ไม่มีฝน | TMD เกณฑ์ปริมาณฝน | ไม่มีฝน | ✅ |  |
| Rain fcst: 3 days (p50) in the table | 0 0 2 |  | 0 0 2 | ✅ |  |
| Gust: 24-h median of member peaks | 21 | 51 members wind_gusts_10m | 21 (p50 = 21.20) | ✅ |  |
| Gust: word (TMD Beaufort) | ลมปานกลาง | TMD เกณฑ์อากาศ p.2 | ลมปานกลาง | ✅ |  |
| Gust: range p10–p90 | 19–24 |  | 19–24 | ✅ |  |
| Gust: 3 days | 21 20 23 |  | 21 20 23 | ✅ |  |
| Other pollution (CAMS at this hour, µg/m³) | PM10 15 · O₃ 24 · NO₂ 15 · SO₂ 3 · CO 642 | CAMS hour 2026-10-24T03:00 | PM10 15 · O₃ 24 · NO₂ 15 · SO₂ 3 · CO 642 | ✅ |  |
| UV now | กลางคืน | CAMS uv_index at 2026-10-24T03:00 = 0.0 | กลางคืน | ✅ |  |
| UV tile value | พรุ่งนี้สูงสุด 9 | daily max: 2026-10-24 7.95, 2026-10-25 8.55, 2026-10-26 7.7 | next daylight is today (2026-10-24): peak 8 | ❌ | at 03:3x the next sun is today's, but the tile says 'tomorrow' (assess.js: c.value = day ? … : `พรุ่งนี้สูงสุด ${air.uv[1]?.max}`) |
| UV: today's peak line + word | สูงสุดวันนี้ราว 8 (สูงมาก) |  | สูงสุดวันนี้ราว 8 (สูงมาก) | ✅ |  |
| UV: 3 days | 8 9 8 |  | 8 9 8 | ✅ |  |
| PM2.5 (GISTDA 24-h estimate) | 30.4 | pm25Avg24hrs = 30.420; pm25 now = 15.00 | 30.4 (ปานกลาง) | ✅ |  |
| PM2.5 GISTDA time | 03:00 น. วันนี้ | last graph hour 2026-10-24T03:00 (Thai time per datetimeThai 'เวลา 3:00 น.') | 03:00 น. วันนี้ | ✅ |  |
| PM2.5 3 days (CAMS daily mean × GISTDA/CAMS ratio) | 33 37 41 | ratio over 24 h = 2.808 → 2.808 | 33 37 41 | ✅ |  |
| PM2.5 'no PCD station within 15 km' (claim) | ไม่มีสถานีวัดของ คพ. ในรัศมี 15 กม. | Air4Thai official: 173 stations; nearest 73t สำนักงานสาธารณสุขแม่สาย 0.8 km, 2026-10-24 03:00 | station 73t สำนักงานสาธารณสุขแม่สาย 0.8 km, 24-h mean 25.4 (ปานกลาง) at 2026-10-24 03:00 | ❌ | the page never got Air4Thai (air4thai.com: ERR_CERT_AUTHORITY_INVALID) and words the failure as 'no station' |
| Other pollution: PCD station | CAMS values | no fresh non-PM2.5 station ≤ 15 km | CAMS is the right fallback | ✅ |  |
| Rain measured (nearest gauge ≤ 10 km, ≤ 3 h) | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่สะพานมิตรภาพแม่น้ำสายแห่งที่ 1 (ห่าง 1.8 กม.) | ThaiWater rain_24h MYA004 2026-10-24T03:00 | วัดได้ 0.0 มม. ใน 24 ชม. ที่ผ่านมา ที่สะพานมิตรภาพแม่น้ำสายแห่งที่ 1 (ห่าง 1.8 กม.) | ✅ |  |
| Rain gauge time | 03:00 น. วันนี้ | 2026-10-24T03:00 | 03:00 น. วันนี้ | ✅ |  |
| Rain tile level | ok |  | ok | ✅ |  |
| Gauge MYA004 | สะพานมิตรภาพแม่น้ำสายแห่งที่ 1 (ลุ่มน้ำโขงเหนือ) ห่าง 1.8 กม.: ต่ำกว่าตลิ่ง 285 ซม. · ยังรับน้ำได้ | ThaiWater 2026-10-24T03:20: level 394.74 m MSL, min_bank 397.59, ground 392.717, situation_level 3 | สะพานมิตรภาพแม่น้ำสายแห่งที่ 1 (ลุ่มน้ำโขงเหนือ) ห่าง 1.8 กม.: ต่ำกว่าตลิ่ง 285 ซม. · ยังรับน้ำได้ (pct 42 %) | ✅ |  |
| Flood area category (FloodWatch rule on ThaiWater gauges) | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 1 สถานี ใกล้สุด 1.8 กม. · ความมั่นใจต่ำ) |  | ภาพรวมทางน้ำรอบจุดนี้: ยังรับน้ำได้ (จาก 1 สถานี ใกล้สุด 1.8 กม. · ความมั่นใจต่ำ) | ✅ |  |
| Flood tile value (basis gauge's freeboard) | ต่ำกว่าตลิ่ง 285 ซม. | MYA004 | ต่ำกว่าตลิ่ง 285 ซม. | ✅ |  |
| Flood source time (nearest fresh gauge) | 03:20 น. วันนี้ | 2026-10-24T03:20 | 03:20 น. วันนี้ | ✅ |  |
| HII flash-flood list | น้ำป่า: ตำบลนี้ไม่อยู่ในรายชื่อเสี่ยงของ สสน. คืนนี้ (0 ตำบลทั่วประเทศ) | 0 rows (header only) | not listed (0 ตำบลทั่วประเทศ) | ✅ |  |
| Quake line 1 | ขนาด 4.6 MYANMAR ห่าง 184 กม. ทางตะวันตกเฉียงเหนือ · 04:08 น. 18 ต.ค. · ไม่น่ารู้สึก | EMSC 2026-10-17T21:08:23Z 21.9272,99.1332 d10.0 | ขนาด 4.6 MYANMAR ห่าง 184 กม. ทางตะวันตกเฉียงเหนือ · 04:08 น. 18 ต.ค. · ไม่น่ารู้สึก (MMI 1.4) | ✅ |  |
| Quake line 2 | ขนาด 3.5 MYANMAR-CHINA BORDER REGION ห่าง 90 กม. ทางตะวันออกเฉียงเหนือ · 05:03 น. 23 ต.ค. · ไม่น่ารู้สึก | EMSC 2026-10-22T22:03:45Z 21.033,100.453 d10.0 | ขนาด 3.5 MYANMAR-CHINA BORDER REGION ห่าง 90 กม. ทางตะวันออกเฉียงเหนือ · 05:03 น. 23 ต.ค. · ไม่น่ารู้สึก (MMI 0.8) | ✅ |  |
| Quake line 3 | ขนาด 4.2 ประเทศลาว ห่าง 266 กม. ทางตะวันออกเฉียงใต้ · 02:31 น. วันนี้ · ไม่น่ารู้สึก | EMSC/TMD 2026-10-23T19:31:21Z 19.081,101.974 d10.0 | ขนาด 4.2 ประเทศลาว ห่าง 266 กม. ทางตะวันออกเฉียงใต้ · 02:31 น. วันนี้ · ไม่น่ารู้สึก (MMI 0.4) | ✅ |  |
| TMD storm CHAMPI | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,350 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,350 กม. | TMD StormTrack (fetched 2026-10-23T20:43:17Z): last obs 2026-10-23T18:00:00 24.8,122.3 ไต้ฝุ่น | กรมอุตุฯ: ไต้ฝุ่น "จำปี" ห่างราว 2,350 กม. เส้นทางคาดการณ์เข้าใกล้สุดราว 2,350 กม. | ✅ |  |
| JMA storm Champi | not shown (TMD's track used) | JMA TC2636 TY | dropped (TMD carries it) | ✅ |  |
| JMA storm In-fa | พายุ In-fa อยู่ห่างราว 7,210 กม. วงคาดการณ์เข้าใกล้สุดราว 6,300 กม. ใน 120 ชม. | JMA TC2637 analysis [10.4, 166.7] | พายุ In-fa อยู่ห่างราว 7,210 กม. วงคาดการณ์เข้าใกล้สุดราว 6,300 กม. ใน 120 ชม. | ✅ |  |
| GDACS TC ≤ 1,000 km | ไม่มีพายุหมุนเขตร้อนในรัศมี 1,000 กม. | Tropical Cyclone VANCE-26 15,832 km | none within 1,000 km | ✅ |  |
| Hotspots ≤ 25 km (VIIRS, not low) | 10 จุด, nearest 5.8 km | collector file (20:25 UTC): 10, nearest 5.8 km | my FIRMS fetch (20:43 UTC): 10, nearest 5.8 km | ✅ |  |
| Fire tile level (app rule: nearest ≤ 10 km → watch, ≤ 2 km → warning) | watch |  | watch | ✅ |  |
| DMR landslide-risk villages ≤ 3 km | 8 | count = 8 | 8 | ✅ |  |
| DMR active-fault subdistrict | 〰️ ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง (รัศมี 20 กม.) ของกรมทรัพยากรธรณี | TB_CODE=570906: 0 feature(s)  | ตำบลนี้ไม่อยู่ในรายชื่อตำบลใกล้รอยเลื่อนมีพลัง | ✅ |  |
| Elevation | 422 | elevation API (page): 422.0 | ensemble response's DEM elevation 422.0 | ✅ |  |
| TMD CAP warning for the province | none | no live item for TH-57 | none | ✅ |  |
| Verdict (highest tile or warning) | เตรียมตัว | tiles {'rain': 0, 'flood': 0, 'pm25': 1, 'heat': 2, 'quake': 0, 'fire': 1, 'wind': 0, 'uv': 0, 'landslide': 0, 'air': -1}, CAP -1 | เตรียมตัว | ✅ |  |
