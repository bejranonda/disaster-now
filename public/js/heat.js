// Heat index (apparent temperature from air temperature and relative humidity).
// US NWS method (https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml, read 2026-10-23): the simple
// Steadman formula first; if its average with T is >= 80 °F, the Rothfusz regression with the NWS's two
// adjustments. TMD's 2012 explainer prints the same NWS table and regression (Hazard-huntz KNOWLEDGE, heat
// index); whether TMD's current product applies the adjustments is unverified (KNOWN_ISSUES KI-004).

const toF = (c) => c * 9 / 5 + 32;
const toC = (f) => (f - 32) * 5 / 9;

export function heatIndexF(tF, rh) {
  const simple = 0.5 * (tF + 61.0 + (tF - 68.0) * 1.2 + rh * 0.094);
  if ((simple + tF) / 2 < 80) return simple;
  let hi = -42.379 + 2.04901523 * tF + 10.14333127 * rh - 0.22475541 * tF * rh
    - 0.00683783 * tF * tF - 0.05481717 * rh * rh + 0.00122874 * tF * tF * rh
    + 0.00085282 * tF * rh * rh - 0.00000199 * tF * tF * rh * rh;
  if (rh < 13 && tF >= 80 && tF <= 112) hi -= ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tF - 95)) / 17);
  else if (rh > 85 && tF >= 80 && tF <= 87) hi += ((rh - 85) / 10) * ((87 - tF) / 5);
  return hi;
}

/** Heat index in °C, or null when an input is missing. */
export function heatIndexC(tC, rh) {
  if (tC == null || rh == null || Number.isNaN(tC) || Number.isNaN(rh)) return null;
  return toC(heatIndexF(toF(tC), Math.max(0, Math.min(100, rh))));
}
