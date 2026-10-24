// Distances, rounding and the subdistrict lookup. Pure functions, no network.

const R_KM = 6371.0088;
const rad = (d) => (d * Math.PI) / 180;

/** Great-circle distance in km (haversine). */
export function km(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** The point sent to any data provider: 2 decimals (~1.1 km), as FloodWatch rounds before its reverse lookup.
 *  The weather and air models are 9–40 km grids, so nothing is lost; the exact GPS fix never leaves the phone. */
export function rounded(lat, lon) {
  return { lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100 };
}

/** A generous box around Thailand (the app's data covers Thailand only). */
export function inThailand(lat, lon) {
  return lat >= 5.4 && lat <= 20.6 && lon >= 97.2 && lon <= 105.8;
}

/** Nearest subdistrict centre from the HDX table ({p, a, t} as built by tools/build_tambon.py). */
export function nearestTambon(data, lat, lon) {
  let best = null;
  let bestD = Infinity;
  const cosLat = Math.cos(rad(lat));
  for (const row of data.t) {
    // equirectangular distance is enough to rank neighbours; the winner gets a true distance below
    const d = (row[3] - lat) ** 2 + ((row[4] - lon) * cosLat) ** 2;
    if (d < bestD) { bestD = d; best = row; }
  }
  return best && describe(data, best, km(lat, lon, best[3], best[4]));
}

/** {code, tambon, amphoe, province, pv, lat, lon, km} for a tambon row. pv is the 2-digit province code. */
export function describe(data, row, distKm = null) {
  const [code, th, en, lat, lon] = row;
  const ap = data.a[String(Math.floor(code / 100))] || ["", ""];
  const pvCode = Math.floor(code / 10000);
  const pv = data.p[String(pvCode)] || ["", ""];
  return {
    code, lat, lon, km: distKm, pv: pvCode,
    tambon: { th, en }, amphoe: { th: ap[0], en: ap[1] }, province: { th: pv[0], en: pv[1] },
  };
}

/** "ต.วัดราชบพิธ อ.พระนคร จ.กรุงเทพมหานคร" (Bangkok: แขวง/เขต) or the English equivalent. */
export function placeLabel(place, lang = "th") {
  if (!place) return "";
  if (lang === "en") return [place.tambon.en, place.amphoe.en, place.province.en].filter(Boolean).join(", ");
  const bkk = place.pv === 10;
  return [`${bkk ? "แขวง" : "ต."}${place.tambon.th}`, `${bkk ? "เขต" : "อ."}${place.amphoe.th}`,
    bkk ? place.province.th : `จ.${place.province.th}`].join(" ");
}

/** The place's label in two parts for the page's title: the subdistrict, then its district and province. */
export function placeParts(place, lang = "th") {
  if (!place) return ["", ""];
  if (lang === "en") return [place.tambon.en, [place.amphoe.en, place.province.en].filter(Boolean).join(", ")];
  const bkk = place.pv === 10;
  return [`${bkk ? "แขวง" : "ต."}${place.tambon.th}`, `${bkk ? "เขต" : "อ."}${place.amphoe.th} ${bkk ? place.province.th : `จ.${place.province.th}`}`];
}

/** Initial bearing in degrees and a Thai/English 8-point compass word, for "120 กม. ทางทิศเหนือ". */
export function bearing(lat1, lon1, lat2, lon2) {
  const y = Math.sin(rad(lon2 - lon1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lon2 - lon1));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

const COMPASS = {
  th: ["เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้", "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ"],
  en: ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"],
};
export function compass(deg, lang = "th") {
  return COMPASS[lang === "en" ? "en" : "th"][Math.round(deg / 45) % 8];
}
