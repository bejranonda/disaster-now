// "Was it felt here?": Allen, Wald & Worden (2012) intensity-prediction equation, hypocentral form, coefficients as
// copied from OpenQuake 3.26.2 openquake/hazardlib/gsim/allen_2012_ipe.py (AllenEtAl2012Rhypo; read 23 Oct 2026 by
// two researchers independently, docs/research/thresholds-2026-10-23.md §8.4). Validated against USGS "Did You Feel
// It?" for quakes felt in Thailand in docs/MODELS.md. No site term: soft ground (Bangkok) can shake more than this.
const C = { c0: 2.085, c1: 1.428, c2: -1.402, c4: 0.078, m1: -0.209, m2: 2.042 };

export function aww12(mag, rhypoKm) {
  const rm = C.m1 + C.m2 * Math.exp(mag - 5);
  let mmi = C.c0 + C.c1 * mag + C.c2 * Math.log(Math.sqrt(rhypoKm ** 2 + rm ** 2));
  if (rhypoKm > 50) mmi += C.c4 * Math.log(rhypoKm / 50);
  return mmi;
}

export const IPE = { name: "Allen, Wald & Worden 2012 (hypocentral)", mmi: (mag, rhypoKm) => aww12(mag, rhypoKm) };
