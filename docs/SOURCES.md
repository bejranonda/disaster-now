# Sources: what the page reads, and how each was tested

Every source the app uses, with the live call that proved it, its time rule and its catch. Tested from a cloud host outside Thailand (an agent proxy, US/EU egress) on **23 Oct 2026, 19:45–20:30 UTC**, honest User-Agent `disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)`, with `Origin` sent to read the CORS header. The full scouting records (110 + 113 calls) are [research/sources-2026-10-23.md](research/sources-2026-10-23.md) and Hazard-huntz `docs/research/open-data-2026-10-21.md`; the thresholds each source is judged by are in [research/thresholds-2026-10-23.md](research/thresholds-2026-10-23.md).

Marks: ✅ live call answered as described · ⚠️ with a catch · 🔑 key needed · ⛔ not reachable from the research host · **[unverified]** documentation or snippet only.

## 1. Read by the phone (CORS)

| Tile | Source | Endpoint (as the page calls it) | CORS | Live result 23 Oct | Time rule | Catch |
|---|---|---|---|---|---|---|
| heat, rain, wind | **Open-Meteo ensemble**, ECMWF IFS 0.25° (51 members) | `ensemble-api.open-meteo.com/v1/ensemble?…&hourly=temperature_2m,relative_humidity_2m,precipitation,wind_gusts_10m&models=ecmwf_ifs025&forecast_days=4&timezone=Asia/Bangkok` | `*` | ✅ 200, 26.7 KB gzip (138 KB raw), 256 series, 96 h from local midnight | local time + `utc_offset_seconds` | free for non-commercial use, CC BY 4.0, limit **per IP** (each visitor's own); the forecast host `api.open-meteo.com` answered "Daily API request limit exceeded" to the shared research IP, the ensemble host didn't |
| PM2.5 outlook, other pollution, UV | **Open-Meteo air quality** (CAMS global) | `air-quality-api.open-meteo.com/v1/air-quality?…&hourly=pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,uv_index,dust&past_days=1&forecast_days=4` | `*` | ✅ 200, 2.1 KB gzip | as above | a model: at 02:00 Bangkok it read 14.6 µg/m³ where PCD stations read 27–33 (24 h means); the page corrects it by the measurement (KNOWLEDGE §5) |
| elevation (profile) | Open-Meteo elevation (Copernicus DEM 90 m) | `api.open-meteo.com/v1/elevation` | `*` | ✅ (Hazard-huntz 21 Oct: Bangkok 4 m) | — | the forecast host's per-IP limit; context only |
| PM2.5 now | **Air4Thai (PCD)** mirror | `air4thai.com/forweb/getAQI_JSON.php` | `*` | ⚠️ 173 stations; curl and Node refuse it (Let's Encrypt YR1 intermediate missing), **headless Chromium read it** (it fetches missing intermediates) | Bangkok time, `AQILast.date` + `time` | the 24-h mean PCD's colours use; `-1` = not measured; O₃ at only 27 of 173 stations; stations can be days old (dropped after 3 h) |
| PM2.5 where no station | **GISTDA** by point | `pm25.gistda.or.th/rest/getPm25byLocation?lat=&lng=` | `*` | ✅ 2.8 KB: hourly 24 h history, 24-h mean, tambon/amphoe/province codes (DOPA) | **"…Z" is Bangkok time** (02:00Z at 19:47 UTC) | an estimate: median **1.31×** PCD stations in 60 provinces on 24 Oct 02:00 (KNOWLEDGE §5) |
| rain measured | **ThaiWater (HII)** | `api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h?province_code=10` | origin reflected | ✅ 13.5 KB gzip, 133 Bangkok gauges | Bangkok time, no offset | `rain_24h` is a rolling 24-h total; 999999 = missing; "not formally public" (FloodWatch), 429 to busy addresses |
| flood | **ThaiWater** | `…/public/waterlevel_load?province_code=10` | origin reflected | ✅ 12 KB gzip; national 241 KB gzip, 803 gauges | as above | `situation_level` counts % of bed-to-bank (not used); `ground_level: 0` means no bed level |
| flash flood | **HII FEWS** report | `fews2.hii.or.th/model-output/data_portal/flashflood/flashflood_report.txt` | `*` | ✅ header only (no subdistrict listed tonight); 21 Oct: one | no time inside (use `Last-Modified`) | FFPI classes [unverified] |
| quakes | **EMSC** fdsnws | `seismicportal.eu/fdsnws/event/1/query?format=json&minlat=-8&maxlat=30&minlon=85&maxlon=112&minmag=2.5&starttime=…` | `*` | ✅ the Laos M4.2 (19.08 N, 101.97 E) 11 min after it struck | UTC | CC BY 4.0 |
| quakes | **USGS** | `earthquake.usgs.gov/…/summary/4.5_week.geojson` | `*` | ✅ | epoch ms | public domain |
| storms | **JMA RSMC Tokyo** | `www.jma.go.jp/bosai/typhoon/data/targetTc.json` → `TC{id}/forecast.json` | `*` | ✅ 2 storms (Champi TY, In-fa TS), files < 1 KB, 70 % circles to 120 h | UTC and JST given | the JMA site's own data, may change without notice; western Pacific and South China Sea only |
| storms, events | **GDACS** | `gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC;FL;DR;WF;EQ&alertlevel=Green;Orange;Red&fromdate=…` | `*` | ✅ (CHAMPI-26 Red, current) | — | "not meant to substitute … official" warnings; without `alertlevel` only Orange/Red |
| landslide | **DMR** ArcGIS `HAZARD/VILLLAGE_RISK` (the misspelling is the service's) | `gisportal.dmr.go.th/arcgis/rest/services/HAZARD/VILLLAGE_RISK/MapServer/0/query?geometry=lon,lat&distance=3000&…&returnCountOnly=true` | origin reflected | ✅ 44 villages within 10 km of Chiang Mai | — | licence **not stated** (`copyrightText` empty): OWNER_ACTIONS |
| fault (profile) | **DMR** `HAZARD/T_ACTIVEFAULT` (subdistricts within 20 km of an active fault, 1,329 points) | `…/T_ACTIVEFAULT/MapServer/0/query?where=TB_CODE='…'` (by code, no position) | origin reflected | ✅ | — | as above |
| search | **Photon** (komoot) | `photon.komoot.io/api/?q=…&bbox=97.3,5.6,105.7,20.5` | `*` | ✅ the soi itself for "ซอยลาดพร้าว 71" | — | fair use, "extensive usage will be throttled"; `lang=th` refused, default names are Thai |
| search (fallback) | **Nominatim** (OSMF) | `nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=th&…` | `*` | ✅ | — | **1 request a second for the whole app**, no autocomplete, must be switchable (config.json) |
| place names | **HDX COD-AB Thailand** (Royal Thai Survey Department, OCHA) | bundled `data/tambon.json` (514 KB, 158 KB gzip), built by `tools/build_tambon.py` | — | ✅ 77 / 928 / 7,425; GISTDA's `tb_idn` 100103 = HDX `TH100103` | — | CC BY-IGO; nearest centre ≠ containing polygon near borders (KNOWN_ISSUES) |

## 2. Read by the collector (no CORS, or a broken certificate)

| File | Source | Endpoint | Live result 23 Oct | Time rule | Catch |
|---|---|---|---|---|---|
| `warnings.json` | **TMD CAP** | `www.tmd.go.th/api/xml/CAP` → each item's CAP XML | ✅ RSS 7 items, 1 in force: "Heavy Rain", Severe, until 24 Oct 08:00 +07, 11 southern provinces as `ISO3166-2 TH-80…` | **take times from the CAP item**; the RSS `pubDate` is 7 h early (Hazard-huntz docs/09) | "public domain"; TMD marks its routine heavy-rain alert Severe (so Severe → เตรียมตัว); polygons = province outlines (dropped) |
| `tmd_quakes.json` | **TMD** earthquake RSS | `earthquake.tmd.go.th/feed/rss_inside.xml` | ✅ 10 items; the Laos M4.2 "ประเทศลาว … 02:31 น." | the description's CE time is Bangkok time | depth not given (10 km assumed) |
| `storms.json` | **TMD** storm page data | `www.tmd.go.th/api/Weather/StormTrack?stormId=0` | ✅ 16.8 KB: จำปี (CHAMPI), 41 points to 26 Oct 18:00 | **`time` is UTC without an offset** (pairs with `dateTimeTH` +7 h, Buddhist year) | the page's own call, not a documented API |
| `hotspots.json` | **NASA FIRMS** VIIRS SNPP + NOAA-20, SE Asia 24 h | `firms.modaps.eosdis.nasa.gov/data/active_fire/…/SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv` (+ `J1_…`) | ✅ 303 hotspots in Thailand's box (low confidence left out) | `acq_date` + `acq_time` UTC | 1.9 MB, no gzip, no CORS |
| `air4thai.json` | **Air4Thai** | `air4thai.pcd.go.th/services/getNewAQI_JSON.php` with `tools/certs/` | ⚠️ TLS now verifies; the server answered **HTTP 503** twice (20:16, 20:21 UTC) | as above | the page falls back to the CORS mirror |

## 3. Linked, not read

TMD's warnings page (`tmd.go.th/warning-and-events/warnings`, ✅ 200), DDPM (`disaster.go.th`, ⚠️ 403 bot check to scripts), TMD earthquake watch (✅), Air4Thai (⚠️ TLS to scripts), ThaiWater (✅), FloodWatch point check (`flood.autobahn.bot/#p=lat,lon`, ✅), บ้านรอดไหม guides (`/hot /air /storm /flood /landslide /quake /pm25 /mask`, ✅ 200 each), LINE share (`line.me/R/share?text=`, ✅ 302).

## 4. Tested and not used (yet)

- **FloodWatch `/api/point`, `/api/stations`, `/api/geocode`**: ✅ answer, **no CORS** → [INTEGRATION.md](INTEGRATION.md).
- **Open-Meteo forecast / previous-runs / historical-forecast hosts**: "Daily API request limit exceeded" for the shared research IP; fine for visitors (per IP), not used so the page doesn't depend on a second Open-Meteo host.
- **GISTDA flood frequency and drought** (🔑, 407/401), **TMD 7-day forecast** (🔑), **ONWR api.waterrisk** (DNS fails at some resolvers), **RSMC New Delhi** (TLS), **Blitzortung** (terms forbid warning use), **ASMC haze** (written permission needed), **NDWC** (`ndwc.go.th` doesn't exist), **WAQI** (demo token answered Bangkok with Shanghai), **OpenAQ / ReliefWeb** (keys), **GloFAS at a point** (lands on side cells, Hazard-huntz docs/08).
- **Candidates for the next version** (research/sources §4): JTWC's Indian Ocean bulletins, ONWR's official flood-warning tiles (CORS reflected, today to +3 days), Copernicus GFM and NASA VIIRS flood pixels ("water seen"), GWIS fire danger, DMR flash-flood class and sinkholes per subdistrict, TMD's keyless XML and clear-sky UV CSV, ThaiWater salinity, HII tides.
