// Corrections the forecast validation found worth shipping (docs/MODELS.md; research/out/*.json, 23 Oct 2026).
// Each one beat the raw model on a later period and on stations it wasn't fitted on. Change a number only with a new
// validation run (GUIDELINES §7).

/** Heat index, daily max: ECMWF reads about 5 °C too low against TMD's stations (bias −4.7 to −5.9 °C, 2025–2026,
 *  18 stations). National linear fit HI_obs ≈ a + b·HI_fc on 2025, 8 stations (sample A); tested on 2026 (sample A,
 *  later) and on 10 held-out stations: MAE 4.7–5.1 → 2.4 °C; danger days (≥ 42 °C) found 0–6 % → 68–86 %
 *  (research/out/e1e2_results.json → heat_linear_fit_2025_A, heat). `sd` is the 2025 residual SD used to dress the
 *  ensemble (its own 10–90 % range held only 2 % of observations; dressed, 82 %). */
export const HEAT = {
  lead1: { a: 10.375, b: 0.8647, sd: 2.95 }, // today and tomorrow (fit: day-1 forecasts, 30–33 h)
  lead2: { a: 11.689, b: 0.826, sd: 3.01 }, // the day after (fit: day-2 forecasts, 54–57 h)
  source: "research/out/e1e2_results.json (fit 2025 sample A; tested 2026 and held-out stations)",
};

/** PM2.5, daily mean: "damped persistence" — the latest measured 24-h mean scaled by CAMS's own predicted change,
 *  damped: forecast = measured × (CAMS(day) ÷ CAMS(past 24 h))^β. β fitted Dec 2025–Feb 2026 (sample A stations).
 *  Next-day MAE (µg/m³): Mar–Apr on disjoint stations 6.55 vs persistence 7.31, the ratio method 8.76, raw CAMS 16.7;
 *  newest season (20 Sep–22 Oct 2026, all stations) 2.78 vs 3.04, 4.65, 6.08. Chosen after the first test run (post
 *  hoc), then confirmed on the newest season (research/out/e3_results.json → damped_posthoc_betas, tests). */
export const PM25 = { beta: [0.45, 0.55, 0.55], source: "research/out/e3_results.json" };

/** Normal CDF, for dressing ensemble members with the corrected forecast's tested error. */
export function phi(z) {
  // Abramowitz–Stegun 7.1.26 erf approximation (|error| < 1.5e-7)
  const t = 1 / (1 + 0.3275911 * Math.abs(z / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-((z / Math.SQRT2) ** 2));
  return 0.5 * (1 + Math.sign(z) * y);
}

/** Corrected daily-max heat index for one member's raw value. */
export const correctHeat = (hi, c) => (hi == null ? null : c.a + c.b * hi);

/** Share of a dressed ensemble at or above `thr`: mean over members of P(x_m + e ≥ thr), e ~ N(0, sd). */
export const dressedChance = (vals, thr, sd) => (vals.length ? vals.reduce((s, x) => s + phi((x - thr) / sd), 0) / vals.length : null);

/** Quantile q of the dressed mixture (bisection, as in research/e1e2_weather.py). */
export function dressedQuantile(vals, q, sd) {
  if (!vals.length) return null;
  let lo = Math.min(...vals) - 5 * sd;
  let hi = Math.max(...vals) + 5 * sd;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (1 - dressedChance(vals, mid, sd) < q) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
