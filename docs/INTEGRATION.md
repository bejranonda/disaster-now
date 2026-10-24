# Integration with the owner's other apps: frank suggestions

The owner has three apps that touch the same people on the same bad day. Built separately, they risk telling a family three different things. This page says what each should own, what was checked on 23 Oct 2026, and the small changes that would make them one service.

## 1. Who owns what

| App | Owns | Doesn't own |
|---|---|---|
| **FloodWatch** (`flood2026-research`, https://flood.autobahn.bot) | water: 1,409 gauges (`/api/stations`, 20:23 UTC), BMA's canals, 12–72 h level forecasts with their measured skill, the `/impact` reservoir cases | heat, dust, quakes; "what to do" |
| **บ้านรอดไหม** (`Hazard-huntz`, https://baanrodmai.autobahn.bot) | **what to do**: 9 sourced guides, the home kit, the family plan, calculators | live data (its N28 "around my home" is only proposed) |
| **ภัยรอบบ้าน · Thai Risk** (this repo, `disaster-now`; https://risk.autobahn.bot) | **what is happening at this point now and in 3 days, for every hazard**, in one page | detail (it links to FloodWatch) and advice beyond one sourced line (it links to บ้านรอดไหม) |

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

### Checked again on 24 Oct 2026 (0.4.0, from `autobahn-bot`; [output cross-check](research/output-crosscheck-2026-10-24.md))

| Check | Result |
|---|---|
| Gauge statuses vs FloodWatch's `/api/stations`, nationwide | **737 of 742** agree; the 5 others were newer readings on one side (the cross-check compares readings fetched minutes apart, X18) |
| The point's area category vs FloodWatch's `/api/point`, six points | 6 of 6 equal; the confidence differs in Bangkok (FloodWatch sees BMA's canals, KI-007) |
| Measured rain vs FloodWatch's gauge | 6 of 6 equal |
| Advice lines and band words vs บ้านรอดไหม | equal (`npm run check:advice`) |
| Colours for the same word | **not equal** (X17, below) |
| CORS on FloodWatch's `/api/point`, `/api/stations`, `/api/geocode` | **still none**; OPTIONS answers 405 (B1, B2) |
| บ้านรอดไหม's English guides | all 8 answer 200; the English page links to them since 0.4.0 (they went to the Thai pages through a no-op, X10) |

## 3. Small changes in FloodWatch that would help most

1. **CORS on `/api/point` for this site's origin.** Then the flood tile shows FloodWatch's own answer, which includes BMA's canal gauges (this app sees only ThaiWater's 8 Bangkok gauges; FloodWatch had 33 near the old town). `/api/point` is already a private-query path (not logged). Turn it on in `public/config.json` with `"floodwatchPoint": true` once FloodWatch allows it.
2. **CORS on `/api/geocode`.** Nominatim's 1-request-a-second limit is for a whole application's users together; FloodWatch already throttles and caches to it and never logs queries (its D-032). Then set `"geocoder": "floodwatch"` in `public/config.json`.
3. **Nothing of this app on FloodWatch's server** (changed 24 Oct 2026, D-040). Its collector was tested there on
   23 Oct (5 of 5 files, Air4Thai 173 stations), but it shared FloodWatch's IP and quota (KI-029). It now runs on a
   server of its own ([SERVER.md §2](SERVER.md#2-the-risk-server-install-go-live-and-leave-floodwatchs-server)), and the
   page comes from Cloudflare's edge at `risk.autobahn.bot` ([CLOUDFLARE.md](CLOUDFLARE.md)), **not** through
   FloodWatch's tunnel. No shared failure, no shared token, no shared IP.
4. **A frank one about FloodWatch itself:** its bank rule counts "% of the height from the river bed to the bank". On a deep river that reads "ใกล้ล้นตลิ่ง" while the water is far below the bank: C.12 (Chao Phraya at Samsen) was "warning" at 92 % with **1.31 m** of freeboard on 24 Oct 02:00. FloodWatch marks the rule heuristic (its `classify_status` docstring). A freeboard rule for rivers (e.g. watch under 1.0 m, warning under 0.5 m, as FloodWatch's own `scenarios.py` uses for the impact strip) would read better to citizens. This app copies FloodWatch's rule for consistency; change both together.

5. **Publish the ThaiWater snapshot FloodWatch already fetches** (every 10 min) as a file this app can read, e.g.
   `/api/stations` with CORS, or a KV key on the same Cloudflare account. On 23 Oct ThaiWater answered HTTP 429 to the
   server both apps shared that night (KI-029). Even on separate servers, one fetch for the family is kinder to HII.
6. **From the hazards research of 24 Oct 2026** ([predict-hazards](research/predict-hazards-2026-10-24.md)):
   - **GloFAS is FloodWatch's to test,** at its own gauges, matching river cells by upstream area (the nearest cell was
     a side channel at 4 of 8 gauges), 3–15 days ahead, against its "no change" baseline; credit Copernicus EMS.
   - **Publish a daily 07–07 rain total** from the ThaiWater gauges FloodWatch already fetches: the dense network this
     page would need to verify a "within 25 km" rain chance and Thai antecedent-rain landslide thresholds, without one
     more ThaiWater call.
   - **Keep dated archives** of HII's flash-flood list and ONWR's notices, so both can be scored later.
7. **One AI pattern for the family.** FloodWatch's `ai.run` (budget, breaker, `reasoning_effort: "low"`, content-only
   answers, checks before showing) is the right shape. This app's `tools/glm.mjs` and `tools/translate.mjs` follow it
   in Node. If the two apps grow more AI uses, share the checker ideas (numbers, places, verdict words, region words),
   not the code. FloodWatch's KI-373…375 are the lessons.

## 4. Small changes in บ้านรอดไหม

1. **Link to Disaster Now** from the start screen and from each guide ("ตอนนี้ที่บ้านคุณ").
2. Its `public/_headers` sends `Permissions-Policy: geolocation=()`. Fine there, but don't let it be copied to this app's host.
3. Its `content/kit.json` already answers with CORS `*`: this app could read the advice lines from it at build time instead of keeping a copy; for now `npm run check:advice` catches drift.

## 5. One family, one look

- **Link previews:** since 0.3.0 this page has Open Graph tags and a 1200 × 630 card (`public/og.png`, from
  `tools/make-images.mjs`). In LINE the preview is what a family sees before anyone taps. Give FloodWatch and บ้านรอดไหม
  cards in the same layout (icon, Thai name, one line, the four level chips) and the family looks like one service.

- **The same four-level scale** in all three apps would help most. **Today the colours differ** (checked 24 Oct, X17):
  - FloodWatch: normal `#2f6fb0` and warning `#e46c0a` are this app's, but watch `#b58900` and critical `#c62828` are not
    (this app: `#F2E700`, `#B3122E`). An earlier version of this page said they "already match"; two of four don't.
  - บ้านรอดไหม colours each **agency band**: heat เฝ้าระวัง green `#6CC04A`, เตือนภัย yellow `#F2CF3A`, อันตราย orange
    `#F28C28`, อันตรายมาก red `#E5372E`; PM2.5 ดี green. This app colours **what to do** (four levels), so Hat Yai's
    "เตือนภัย 41 °C" is orange here and yellow there.
  - **Frank suggestion:** pick one. This app's rule (colour = what to do, words = the agency's) is the one a family can
    act on across hazards, and it is what FloodWatch half-uses already. Change FloodWatch's two colours, and give
    บ้านรอดไหม's heat and dust tools the four action colours with the agency's word on them. The owner's call (D2).
- **The heat words beside TMD's notices** (visitor audit U9): "เตือนภัย"/"Warning" is both DOH/TMD's heat band and the
  word for a TMD notice, so "Rain: TMD warning · Heat: Warning" read as two official warnings. This app now names the
  band as a level in its verdict ("ระดับเตือนภัย", "Warning level"); the band words stay บ้านรอดไหม's. If บ้านรอดไหม shows
  the band beside notices too, do the same there.
- **One name family:** decided for this app on 24 Oct 2026: **ภัยรอบบ้าน · Thai Risk**, so the family reads
  **บ้านรอดไหม** (what to do), **ภัยรอบบ้าน** (what is happening around home) and **FloodWatch** (water). The two Thai
  names share "บ้าน"; a shared footer line ("ภัยรอบบ้าน · บ้านรอดไหม · FloodWatch") on all three would make it visible.
- **One "official channels" block** (TMD 1182, DDPM 1784, Cell Broadcast, LINE ALERT), the same words in all three.
