#!/usr/bin/env bash
# Re-test the sources this app depends on, as on 23 Oct 2026 19:47 UTC (research/logs/probe-2026-10-23.log).
#   bash research/probe_sources.sh [outdir]      → one line per source: name | HTTP status | bytes | CORS header
# Honest User-Agent, one call per source, an Origin header to read CORS. Keep it that small: these are agencies' servers.
set -u
OUT=${1:-$(mktemp -d)}
UA="disaster-now-research/0.1 (+https://github.com/bejranonda/disaster-now)"
URLS=$(cat <<'LIST'
isd_bkk https://www.ncei.noaa.gov/data/global-hourly/access/2026/48455099999.csv
meteostat_daily_bkk https://bulk.meteostat.net/v2/daily/48455.csv.gz
meteostat_hourly_bkk https://bulk.meteostat.net/v2/hourly/48455.csv.gz
a4t_now http://air4thai.pcd.go.th/services/getNewAQI_JSON.php
a4t_mirror https://air4thai.com/forweb/getAQI_JSON.php
a4t_hist http://air4thai.pcd.go.th/webV2/history/api/data.php?stationID=10t&param=PM25&type=hr&sdate=2026-10-20&edate=2026-10-22&stime=00&etime=23
gistda_prov https://pm25.gistda.or.th/rest/getPm25byProvince
gistda_loc https://pm25.gistda.or.th/rest/getPm25byLocation?lat=13.75&lng=100.50
tw_rain_bkk https://api-v3.thaiwater.net/api/v1/thaiwater30/public/rain_24h?province_code=10
tw_wl_bkk https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load?province_code=10
hii_ff https://fews2.hii.or.th/model-output/data_portal/flashflood/flashflood_report.txt
fw_stations https://flood.autobahn.bot/api/stations
fw_point https://flood.autobahn.bot/api/point?lat=13.75&lon=100.5
fw_health https://flood.autobahn.bot/api/health
usgs_day https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson
emsc https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=5&minlat=0&maxlat=30&minlon=88&maxlon=110
bmkg https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json
tmd_cap https://www.tmd.go.th/api/xml/CAP
tmd_eq https://earthquake.tmd.go.th/feed/rss_inside.xml
firms_sea https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_24h.csv
gdacs https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;DR;WF&country=Thailand
dmr_fault https://gisportal.dmr.go.th/arcgis/rest/services/HAZARD/T_ACTIVEFAULT/MapServer/0/query?where=1%3D1&returnCountOnly=true&f=json
dmr_vill https://gisportal.dmr.go.th/arcgis/rest/services/HAZARD/VILLLAGE_RISK/MapServer/0/query?geometry=98.98,18.79&geometryType=esriGeometryPoint&inSR=4326&distance=10000&units=esriSRUnit_Meter&returnCountOnly=true&f=json
hdx https://data.humdata.org/api/3/action/package_show?id=cod-ab-tha
nominatim https://nominatim.openstreetmap.org/search?q=%E0%B8%A5%E0%B8%B2%E0%B8%94%E0%B8%9E%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%A7&format=jsonv2&limit=2&countrycodes=th
photon https://photon.komoot.io/api/?q=Lat%20Phrao&limit=2&lat=13.75&lon=100.5
LIST
)
while read -r name url; do
  [ -z "$name" ] && continue
  ( out=$(curl -sS -m 40 -A "$UA" -H "Origin: https://disaster-now.example" -H "Accept-Encoding: gzip" \
      -D "$OUT/h_$name.txt" -o "$OUT/b_$name.bin" -w "%{http_code} %{size_download}" "$url" 2>&1)
    cors=$(grep -i '^access-control-allow-origin' "$OUT/h_$name.txt" 2>/dev/null | tr -d '\r' | head -1)
    echo "$name | $out | $cors" ) &
done <<< "$URLS"
wait
echo "raw responses in $OUT"
