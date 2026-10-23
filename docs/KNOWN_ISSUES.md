# Known issues and limits

Numbered KI-NNN; the next number is the first one not used below. Move a fixed issue to "Fixed" with its evidence. Severity: **high** (could mislead someone about a hazard), **medium** (a gap or a wrong detail), **low** (polish).

## Open

### KI-001 Not deployed, not tried on real phones (high)
Built and checked only in headless Chromium in a cloud session (23 Oct 2026). GPS inside LINE's in-app browser is undocumented by LINE; iPhone Safari is untested. **Next:** [OWNER_ACTIONS A1, A4](OWNER_ACTIONS.md#a-to-go-live).

### KI-002 Air4Thai's server sends a broken certificate chain (medium)
Let's Encrypt's YR1 intermediate is missing (Hazard-huntz docs/09 §3). curl, Node and Python refuse it; headless Chromium read the CORS mirror `air4thai.com` on 23 Oct (it fetches missing intermediates); iPhones are untested. The collector adds the two public intermediates for that host only (`tools/certs/`), verification on; the PCD's server then answered **HTTP 503** twice (20:16, 20:21 UTC). Where Air4Thai fails, PM2.5 falls back to GISTDA's estimate (KI-009). **Fix belongs to the PCD** (OWNER_ACTIONS C5).

### KI-003 Without the collector, four feeds are missing (medium)
TMD's warnings, TMD's quake list, TMD's storm tracks and NASA FIRMS hotspots need the collector; the fire tile then says "ยังไม่มีข้อมูล" and the verdict lists it as missing, and no TMD warning banner can show. **Next:** OWNER_ACTIONS A3.

### KI-004 The heat-index bands rest on news reports quoting the agencies (medium)
27.0 / 33.0 / 42.0 / 52.0 °C agree across BMA, DOH and TMD reports (thresholds §1.1), but only the 42.0–51.9 band was seen on an agency page; which formula TMD's own product uses is **[unverified]** (its agromet page names Steadman 1979 and shows older bands 27/32/41/54). The app uses the NWS method (Steadman, then Rothfusz); TMD's own example (33 °C, 80 %) gives 48.1 °C by it against TMD's 49 °C.

### KI-005 The heat tile is orange (เตรียมตัว) most days (medium; owner decision D1)
TMD/DOH call 33.0–41.9 °C "เตือนภัย"; for Bangkok on 24–26 Oct the ensemble median daily max was 38–39 °C. Kept, because the app is never milder than the agency; it may teach people to ignore orange. **Next:** count orange-verdict days in the first month.

### KI-006 The subdistrict is the nearest centre, not the one containing the point (medium)
Near a district or province border the nearest of 7,425 centres can be the neighbour, and a TMD warning is matched by province. Not measured yet; the page offers "ไม่ใช่ตำบลนี้?". **Next:** measure against the boundary file (ROADMAP v0.3, item 9).

### KI-007 In Bangkok the flood tile sees few canal gauges (medium)
ThaiWater gives 8 gauges for Bangkok (FloodWatch's point check counted 33 near the old town, most of them BMA canals behind BMA's own servers). The app mirrors FloodWatch's rule but with less data, so its confidence is often "ต่ำมาก". **Fix:** FloodWatch CORS on `/api/point` (OWNER_ACTIONS B1) and `"floodwatchPoint": true`.

### KI-008 FloodWatch's river rule reads deep rivers as near the bank (medium)
C.12 (Chao Phraya, Samsen) was "ใกล้ล้นตลิ่ง" at 92 % of bed-to-bank with **1.31 m** of freeboard (24 Oct 02:00). The app copies FloodWatch's rule for consistency and leads with the freeboard and a line explaining the %. **Fix in both apps together** (INTEGRATION §3.4).

### KI-009 GISTDA's PM2.5 estimate ran 1.3× the PCD's stations (medium)
On 24 Oct 02:00 a median 1.31× across 60 provinces (KNOWLEDGE §5); one snapshot. Used only where no PCD station is within 15 km, labelled "ค่าประมาณ", and as the CAMS correction's reference there.

### KI-010 Felt intensity has no site term (medium)
AWW12 gives MMI ≈ 3.6 in Bangkok for the 2025 M7.7 Myanmar quake, where a building collapsed; soft clay and tall buildings shake more. The card says so. See MODELS.md for the DYFI comparison.

### KI-011 Open-Meteo's free limit is per IP (medium)
10,000 calls a day per IP for non-commercial use; each visit makes about three (ensemble, air quality, elevation; whether the ensemble's 51 members raise its weight is **[unverified]**). Thai mobile carriers put many phones behind one address (carrier-grade NAT) [unverified for Thailand], so a page shared widely in a disaster could hit the limit for a whole carrier. The research IP of this session already had. **Fix (ROADMAP):** the collector fetches the ensemble once per district centre twice a day (928 calls) and publishes district files; then no point leaves the phone and the limit is ours alone.

### KI-012 Street search depends on third-party goodwill (low)
Photon is "fair use, throttled when heavy"; Nominatim allows 1 request a second for the whole app. Both see what was typed (their privacy terms apply; the button says so). **Fix:** FloodWatch's `/api/geocode` with CORS (OWNER_ACTIONS B2).

### KI-013 Storm data are undocumented site files (low)
JMA's `bosai` JSON and TMD's `/api/Weather/StormTrack` are the sites' own data, not documented APIs, and may change without notice; JMA doesn't cover the Andaman Sea or the Bay of Bengal (JTWC does: ROADMAP v0.3.3).

### KI-014 The DMR's layers state no licence (low)
`copyrightText` is empty on the landslide-village and active-fault layers the page queries live (OWNER_ACTIONS C1).

### KI-015 HII's API is "not formally public" (low)
Each visit asks ThaiWater for its province's rain and levels (13–14 KB gzip each). At scale the collector should publish province files instead (Hazard-huntz docs/09).

### KI-016 The subdistrict table is 158 KB gzipped (low)
Loaded on every first visit (then cached by the service worker). A 3-decimal, Thai-only build is about 92 KB (UX scout §4c).

### KI-017 UV is CAMS's, daylight is a fixed 06–18 (low)
The tile grades the UV index now from CAMS (via Open-Meteo); TMD publishes its own clear-sky UV forecast for 77 stations (ROADMAP v0.3.4). Whether CAMS's `uv_index` includes clouds is **[unverified]** (Open-Meteo also offers `uv_index_clear_sky`).

### KI-018 Gust words use the Beaufort scale, which is for the 10-minute mean (low)
TMD's Beaufort words are applied to the strongest gust, a cautious choice; the card says "ลมกระโชก".

### KI-019 Only heat and PM2.5 have a sourced one-line action (low)
The verdict's 👉 line comes from บ้านรอดไหม's lines for those two; other hazards link to its guides.

### KI-020 The visitor walk runs on fixtures of one night (low)
`npm run smoke` pins the clock to 23 Oct 2026 19:50 UTC; a dry, calm night. Rainy, smoky and quake fixtures would test more of the page. `--live` checks today's sources but not a bad day.

### KI-021 The Thai copy hasn't been read by a native reviewer (medium)
OWNER_ACTIONS A5.

## Fixed

### KI-F01 Gauge statuses disagreed with FloodWatch on 15 gauges (23 Oct 2026)
ThaiWater's `ground_level: 0` was read as a river bed at 0 m MSL. Now treated as missing, as FloodWatch does: 691 of 693 agree (`research/logs/crosscheck-floodwatch-2026-10-23.log`).

### KI-F02 The verdict called a mostly empty page calm (23 Oct 2026)
With every source down but the local hotspot file, it said "ทุกเรื่องอยู่ในระดับต่ำสุด". Now fewer than half the tiles answering gives "ยังไม่มีข้อมูลพอ", and an incomplete page says some hazards have no data (smoke test "all sources down").

### KI-F03 The GPS headline said "ตำแหน่งของฉัน" instead of the place (23 Oct 2026)
Now the subdistrict is the headline and "📍 ตำแหน่งของฉัน (±… ม.)" the subtitle.

### KI-F04 The finder overflowed at 320 px with larger text (23 Oct 2026)
The grid column now shrinks (`minmax(0, 1fr)`); the smoke test checks 320 px with ก+.
