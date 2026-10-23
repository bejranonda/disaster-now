"""Heat index, US National Weather Service method — the one implementation the research
and the app share (the app's JS must reproduce TEST_VECTORS below).

Source (read 2026-10-23, HTTP 200 from www.wpc.ncep.noaa.gov, page last modified 12 May 2022):
    NOAA/NWS Weather Prediction Center, "The Heat Index Equation",
    https://www.wpc.ncep.noaa.gov/html/heatindex_equation.shtml

The method, in degrees Fahrenheit (T) and relative humidity in percent (RH):
  1. Simple formula (Steadman-consistent):  HI_s = 0.5 * (T + 61.0 + (T - 68.0) * 1.2 + RH * 0.094)
  2. "In practice, the simple formula is computed first and the result averaged with the
     temperature. If this heat index value is 80 degrees F or higher, the full regression
     equation along with any adjustment ... is applied", i.e. if (HI_s + T) / 2 >= 80:
       HI = -42.379 + 2.04901523*T + 10.14333127*RH - .22475541*T*RH - .00683783*T*T
            - .05481717*RH*RH + .00122874*T*T*RH + .00085282*T*RH*RH - .00000199*T*T*RH*RH
       - if RH < 13 and 80 <= T <= 112: HI -= ((13 - RH) / 4) * sqrt((17 - |T - 95|) / 17)
       - if RH > 85 and 80 <= T <= 87:  HI += ((RH - 85) / 10) * ((87 - T) / 5)
     otherwise HI = HI_s.
  The page notes that the regression "is not valid for extreme temperature and relative
  humidity conditions beyond the range of data considered by Steadman"; the app should cap
  what it prints (e.g. "52 °C or more") rather than show a precise number up there.

Inputs and outputs of `heat_index_c` are in degrees Celsius. Conversion: F = C * 9/5 + 32.
The boundary words "between 80 and 112" / "between 80 and 87" are read as inclusive.

Thai levels (DOH/TMD 2024 scheme, see Hazard-huntz docs/KNOWLEDGE.md §32.8):
  เฝ้าระวัง 27.0–32.9 · เตือนภัย 33.0–41.9 · อันตราย 42.0–51.9 · อันตรายมาก >= 52.0 °C.
Whether the TMD's own product uses exactly this NWS variant is [unverified] (KNOWLEDGE §32.8).

Run the self-test:  python3 research/heat_index.py
(It also checks against MetPy's independent implementation when MetPy is installed.)
"""
from __future__ import annotations

import math

LEVELS = [  # (lower bound °C, Thai name, English)
    (27.0, "เฝ้าระวัง", "watch"),
    (33.0, "เตือนภัย", "warning"),
    (42.0, "อันตราย", "danger"),
    (52.0, "อันตรายมาก", "extreme danger"),
]


def c_to_f(c: float) -> float:
    return c * 9.0 / 5.0 + 32.0


def f_to_c(f: float) -> float:
    return (f - 32.0) * 5.0 / 9.0


def heat_index_f(t_f: float, rh: float) -> float:
    """NWS heat index in °F from air temperature in °F and RH in %."""
    hi_s = 0.5 * (t_f + 61.0 + (t_f - 68.0) * 1.2 + rh * 0.094)
    if (hi_s + t_f) / 2.0 < 80.0:
        return hi_s
    t, r = t_f, rh
    hi = (-42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r
          - 0.00683783 * t * t - 0.05481717 * r * r + 0.00122874 * t * t * r
          + 0.00085282 * t * r * r - 0.00000199 * t * t * r * r)
    if r < 13.0 and 80.0 <= t <= 112.0:
        hi -= ((13.0 - r) / 4.0) * math.sqrt((17.0 - abs(t - 95.0)) / 17.0)
    elif r > 85.0 and 80.0 <= t <= 87.0:
        hi += ((r - 85.0) / 10.0) * ((87.0 - t) / 5.0)
    return hi


def heat_index_c(t_c: float, rh: float) -> float:
    """NWS heat index in °C from air temperature in °C and RH in %."""
    return f_to_c(heat_index_f(c_to_f(t_c), rh))


def level(hi_c: float):
    """Thai level name for a heat index in °C (None below 27.0)."""
    name = None
    for lo, th, _en in LEVELS:
        if hi_c >= lo:
            name = th
    return name


def rh_from_dewpoint(t_c: float, td_c: float) -> float:
    """RH (%) from temperature and dew point, Magnus form with Alduchov & Eskridge (1996)
    coefficients a = 17.625, b = 243.04 °C (used only to turn station dew points into RH)."""
    a, b = 17.625, 243.04
    return 100.0 * math.exp(a * td_c / (b + td_c) - a * t_c / (b + t_c))


# (T °C, RH %, HI °C rounded to 0.01, branch exercised). Computed by this file from the
# NWS method above; each branch of the method is covered once or more.
TEST_VECTORS = [
    (25.0, 50.0, 24.86, "simple formula ((HI_s+T)/2 < 80 °F)"),
    (30.0, 60.0, 32.83, "Rothfusz, no adjustment"),
    (32.0, 70.0, 40.41, "Rothfusz, no adjustment"),
    (35.0, 75.0, 53.33, "Rothfusz, no adjustment, extreme band"),
    (38.0, 10.0, 34.73, "Rothfusz minus the low-RH adjustment (RH < 13, 80–112 °F)"),
    (29.0, 90.0, 37.23, "Rothfusz plus the high-RH adjustment (RH > 85, 80–87 °F)"),
]


def _selftest() -> int:
    bad = 0
    for t, rh, want, why in TEST_VECTORS:
        got = heat_index_c(t, rh)
        ok = abs(got - want) < 0.006  # vectors are rounded to 0.01
        bad += not ok
        print(f"T={t:5.1f} °C RH={rh:5.1f} %  HI={got:7.3f} °C  want {want:6.2f}  "
              f"level={level(got)}  {'ok' if ok else 'FAIL'}  [{why}]")
    try:  # independent implementation
        import warnings
        import numpy as np
        from metpy.calc import heat_index as mp_hi
        from metpy.units import units
        warnings.filterwarnings("ignore")
        for t, rh, want, _ in TEST_VECTORS:
            v = mp_hi(np.array([t]) * units.degC, np.array([rh]) * units.percent,
                      mask_undefined=False).to("degC").m
            v = float(np.atleast_1d(v)[0])
            d = abs(v - want)
            print(f"MetPy check T={t} RH={rh}: {v:.3f} °C (diff {d:.3f})")
            bad += d > 0.01
    except ImportError:
        print("MetPy not installed: independent check skipped")
    print("ALL OK" if bad == 0 else f"{bad} FAILED")
    return bad


if __name__ == "__main__":
    raise SystemExit(_selftest())
