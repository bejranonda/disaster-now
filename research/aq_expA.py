"""Experiment A: a calibrated chance that a day's PM2.5 24-h mean passes 37.5 and 75 µg/m³
(docs/research/predict-air-2026-10-24.md §4).

Run:  <venv>/bin/python -I research/aq_expA.py      (needs research/data/aq_daily.csv.gz from aq_data.py)
Writes research/logs/aq_expA-2026-10-24.log and research/out/aq_expA_results.json.

Protocol (fixed before any test score was looked at):
- Events: obs > 37.5 (PCD "เริ่มมีผลกระทบต่อสุขภาพ" or worse) and obs > 75 ("มีผลกระทบต่อสุขภาพ"); target days Dec–Apr.
- Choose: fit on S1 (Dec 2022–Apr 2023), score on S2 (Dec 2023–Apr 2024), sample A stations; the candidate with the
  lowest mean Brier score over both thresholds and leads 1–2 is chosen; likewise the better of two persistence-based
  references. Then refit on S1+S2 (sample A) and score, untouched:
    A-S3 (later season, same stations), B-S3 (later season, disjoint stations), B-S4 and A-S4 (newest season),
    B-S1S2 (same seasons, disjoint stations), the north (B's four northern stations, S3+S4), and the quiet
    Sep 20–Oct 22 2026 rows of research/data/e3_pm25_daily.csv (e3's ten stations).
- Candidates (p = chance of obs > T):
    damp_dress  log obs = log damped + e, e ~ N(mu_k, sd_k)          (the pre-registered primary)
    damp_emp    the same with the empirical distribution of e (quantile mapping)
    damp_het    e ~ N(mu_k, sd_k(x)), log sd linear in x = log damped (maximum likelihood)
    damp_logit  logistic regression of the event on log damped
    pl_logit    logistic regression on log persistence and CAMS's log change (lets the data pick beta)
  References: clim (station × month frequency, Air4Thai 2019 → the season before the test, shrunk (k+.5)/(n+1)),
    pers_dress (lognormal around persistence) and pers_logit (logistic on log persistence).
- Scores: Brier score; Brier skill vs clim and vs the chosen persistence reference, with 90 % intervals from a
  bootstrap over 5-day blocks within station-season; reliability in tenths; the page's rounding (to tens, kept
  within 10–90 %) scored as well; ROC area.
"""
from __future__ import annotations

import json
import sys

import numpy as np
import pandas as pd
from scipy import optimize, stats
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parent))
from aq_common import DATA, OUT, Log, clean  # noqa: E402
from aq_rows import BETA, THR, boot_stat, build_rows, climatology, load  # noqa: E402

L = Log("aq_expA")
CANDS = ["damp_dress", "damp_emp", "damp_het", "damp_logit", "pl_logit"]
REFS = ["pers_dress", "pers_logit"]


def feats(df, kind):
    lp, ld = np.log(df.persist.values), np.log(df.damped.values)
    return {"pers": lp[:, None], "damp": ld[:, None], "pl": np.c_[lp, df.lr.values]}[kind]


def fit(tr: pd.DataFrame, method: str, T: float):
    y = (tr.obs.values > T).astype(int)
    if method in ("damp_dress", "pers_dress", "damp_emp"):
        base = tr.damped if method.startswith("damp") else tr.persist
        e = np.log(tr.obs.values) - np.log(base.values)
        return dict(mu=float(e.mean()), sd=float(e.std(ddof=1)), e=np.sort(e))
    if method == "damp_het":
        x = np.log(tr.damped.values)
        e = np.log(tr.obs.values) - x

        def nll(th):
            mu, a, b = th
            s = np.exp(a + b * (x - 3.5))
            return -np.sum(stats.norm.logpdf(e, mu, s))
        th = optimize.minimize(nll, [0, np.log(e.std()), 0], method="Nelder-Mead").x
        return dict(mu=float(th[0]), a=float(th[1]), b=float(th[2]))
    kind = {"damp_logit": "damp", "pers_logit": "pers", "pl_logit": "pl"}[method]
    if y.sum() < 3 or y.sum() > len(y) - 3:
        return dict(const=float((y.sum() + 0.5) / (len(y) + 1)))
    m = LogisticRegression(C=1e4, max_iter=1000).fit(feats(tr, kind), y)
    return dict(model=m, kind=kind, coef=[float(m.intercept_[0])] + [float(c) for c in m.coef_[0]])


def predict(df: pd.DataFrame, method: str, T: float, par) -> np.ndarray:
    if method == "clim":
        return df["clim_p37" if T == 37.5 else "clim_p75"].values
    if "const" in par:
        return np.full(len(df), par["const"])
    lT = np.log(T)
    if method in ("damp_dress", "pers_dress"):
        base = np.log((df.damped if method.startswith("damp") else df.persist).values)
        return 1 - stats.norm.cdf((lT - base - par["mu"]) / par["sd"])
    if method == "damp_emp":
        base = np.log(df.damped.values)
        e = par["e"]
        return 1 - np.searchsorted(e, lT - base, side="right") / len(e)
    if method == "damp_het":
        x = np.log(df.damped.values)
        s = np.exp(par["a"] + par["b"] * (x - 3.5))
        return 1 - stats.norm.cdf((lT - x - par["mu"]) / s)
    return par["model"].predict_proba(feats(df, par["kind"]))[:, 1]


def page_round(p):
    return np.clip(np.round(np.asarray(p) * 10) / 10, 0.1, 0.9)


def brier(p, o):
    return float(np.mean((np.asarray(p) - o) ** 2))


def reliability(p, o):
    p, o = np.asarray(p), np.asarray(o)
    out = []
    edges = np.linspace(0, 1, 11)
    for i in range(10):
        m = (p >= edges[i]) & ((p < edges[i + 1]) if i < 9 else (p <= 1))
        if m.sum():
            out.append(dict(bin=f"{int(edges[i]*100)}-{int(edges[i+1]*100)}", n=int(m.sum()),
                            mean_p=float(p[m].mean()), obs_freq=float(o[m].mean())))
    return out


def page_reliability(p, o):
    q = page_round(p)
    return [dict(shown=f"{int(round(v*100))}%", n=int((q == v).sum()), obs_freq=float(o[q == v].mean()))
            for v in np.round(np.arange(0.1, 0.91, 0.1), 1) if (q == v).sum()]


def main():
    d = load()
    clim_choose = climatology("2023-06-30")    # used for S2 choosing (before S2)
    clim_test = climatology("2024-06-30")      # used for S3 and S4 tests (before S3)
    rows_c = build_rows(d, clim_choose)
    rows_t = build_rows(d, clim_test)
    L.w(f"rows (station × day × lead, Dec–Apr): {len(rows_t)}; seasons {rows_t.season.value_counts().to_dict()}")
    for s in ("S1", "S2", "S3", "S4"):
        g = rows_t[(rows_t.season == s) & (rows_t.lead == 1)]
        L.w(f"  {s} lead 1: n={len(g)}, obs>37.5 {100*(g.obs>37.5).mean():.1f} %, obs>75 {100*(g.obs>75).mean():.1f} %; "
            f"north {100*(g[g.region=='north'].obs>37.5).mean():.1f} % / {100*(g[g.region=='north'].obs>75).mean():.1f} %")

    res = {"protocol": __doc__, "beta": BETA, "choose": {}, "tests": {}}
    # ---------------- choose on S2 (fit S1), sample A
    A = rows_c[rows_c["sample"] == "A"]
    L.w("\n## Choosing: fit S1, score S2, sample A (Brier score; lower is better)")
    score = {m: [] for m in CANDS + REFS + ["clim"]}
    for k in (1, 2):
        for T in THR:
            tr, te = A[(A.season == "S1") & (A.lead == k)], A[(A.season == "S2") & (A.lead == k)]
            o = (te.obs.values > T).astype(int)
            line = []
            for m in CANDS + REFS + ["clim"]:
                par = None if m == "clim" else fit(tr, m, T)
                bs = brier(predict(te, m, T, par), o)
                score[m].append(bs)
                line.append(f"{m}={bs:.4f}")
            L.w(f"  lead {k} T>{T}: n={len(te)} base rate {o.mean():.3f}  " + "  ".join(line))
    mean_bs = {m: float(np.mean(v)) for m, v in score.items()}
    best = min(CANDS, key=lambda m: mean_bs[m])
    ref = min(REFS, key=lambda m: mean_bs[m])
    L.w(f"  mean Brier over leads 1–2 and both thresholds: " + ", ".join(f"{m} {v:.4f}" for m, v in mean_bs.items()))
    L.w(f"  → chosen candidate: {best}; persistence reference: {ref}; primary (pre-registered): damp_dress")
    res["choose"] = dict(mean_brier=mean_bs, chosen=best, reference=ref)

    # ---------------- refit on S1+S2, sample A
    tr_all = rows_t[(rows_t["sample"] == "A") & rows_t.season.isin(["S1", "S2"])]
    pars = {}
    for k in (1, 2, 3):
        for T in THR:
            for m in set(CANDS + REFS):
                pars[(m, k, T)] = fit(tr_all[tr_all.lead == k], m, T)
    for k in (1, 2, 3):
        for T in THR:
            pd_ = pars[("damp_dress", k, T)]
            ph = pars[("damp_het", k, T)]
            pl = pars[("pl_logit", k, T)]
            L.w(f"  fitted lead {k} T>{T}: damp_dress mu={pd_['mu']:+.3f} sd={pd_['sd']:.3f}; "
                f"damp_het mu={ph.get('mu', 0):+.3f} a={ph.get('a', 0):.3f} b={ph.get('b', 0):+.3f}; "
                f"pl_logit coef={pl.get('coef', pl.get('const'))}")
    res["fitted"] = {f"{m}|lead{k}|{T}": {kk: vv for kk, vv in p.items() if kk not in ("e", "model")}
                     for (m, k, T), p in pars.items()}

    oct_rows = None
    try:
        e3 = pd.read_csv(DATA / "e3_pm25_daily.csv", parse_dates=["date"]).rename(
            columns={"obs": "obs_pm25", "cams": "cams_pm2_5"})
        e3 = e3[e3.date >= "2026-09-01"]
        e3smp = {"35t": "A", "50t": "A", "46t": "A", "44t": "A"}
        e3["sample"] = e3.sid.map(lambda s: e3smp.get(s, "B"))
        e3["region"] = e3.sid.map(lambda s: "north" if s in ("35t", "57t", "67t") else "other")
        e3["season"] = "O26"
        oct_rows = build_rows(e3, climatology("2024-06-30"), months=[9, 10])
        oct_rows = oct_rows[oct_rows.date >= "2026-09-20"]
    except FileNotFoundError:
        pass

    R = rows_t
    tests = {
        "A-S3 (later season, fit stations)": R[(R["sample"] == "A") & (R.season == "S3")],
        "B-S3 (later season, disjoint stations)": R[(R["sample"] == "B") & (R.season == "S3")],
        "B-S4 (newest season, disjoint stations)": R[(R["sample"] == "B") & (R.season == "S4")],
        "A-S4 (newest season, fit stations)": R[(R["sample"] == "A") & (R.season == "S4")],
        "B-S1S2 (fit seasons, disjoint stations)": R[(R["sample"] == "B") & R.season.isin(["S1", "S2"])],
        "north-B-S3S4 (Chiang Rai, Nan, Mae Hong Son, Phrae)": R[(R["sample"] == "B") & (R.region == "north")
                                                                 & R.season.isin(["S3", "S4"])],
        "north-A-S3S4 (Chiang Mai, Lampang, Phayao)": R[(R["sample"] == "A") & (R.region == "north")
                                                        & R.season.isin(["S3", "S4"])],
        "B-S3S4 pooled (disjoint stations, both later seasons)": R[(R["sample"] == "B") & R.season.isin(["S3", "S4"])],
    }
    if oct_rows is not None and len(oct_rows):
        tests["Oct-2026 quiet (e3 stations, 20 Sep–22 Oct)"] = oct_rows
    methods = CANDS + REFS + ["clim"]
    for tname, df in tests.items():
        L.w(f"\n## {tname}")
        res["tests"][tname] = {}
        for k in (1, 2, 3):
            for T in THR:
                g = df[df.lead == k].reset_index(drop=True)
                if len(g) < 20:
                    continue
                o = (g.obs.values > T).astype(int)
                P = {m: predict(g, m, T, None if m == "clim" else pars[(m, k, T)]) for m in methods}
                bs = {m: brier(P[m], o) for m in methods}
                rec = dict(n=len(g), events=int(o.sum()), base_rate=float(o.mean()), brier=bs,
                           brier_page_rounded={m: brier(page_round(P[m]), o) for m in (best, "damp_dress", ref)})
                for m in sorted({best, "damp_dress", ref, "damp_logit", "pl_logit"}):
                    for r_ in ("clim", ref):
                        if m == r_:
                            continue
                        st = boot_stat(lambda ii, m=m, r_=r_: 1 - np.mean((P[m][ii] - o[ii]) ** 2)
                                       / max(np.mean((P[r_][ii] - o[ii]) ** 2), 1e-12), g)
                        rec[f"BSS_{m}_vs_{r_}"] = st
                if 0 < o.sum() < len(o):
                    rec["auc"] = {m: float(roc_auc_score(o, P[m])) for m in methods}
                rec["reliability_" + best] = reliability(P[best], o)
                rec["page_reliability_" + best] = page_reliability(P[best], o)
                rec["page_reliability_damp_dress"] = page_reliability(P["damp_dress"], o)
                if best != "damp_dress":
                    rec["reliability_damp_dress"] = reliability(P["damp_dress"], o)
                rec["reliability_" + ref] = reliability(P[ref], o)
                res["tests"][tname][f"lead{k}|{T}"] = rec
                L.w(f" lead {k} T>{T}: n={len(g)} events={o.sum()} ({100*o.mean():.1f} %)  Brier "
                    + " ".join(f"{m}={bs[m]:.4f}" for m in methods))
                for kk, v in rec.items():
                    if kk.startswith("BSS_"):
                        L.w(f"    {kk:32s} {v[0]:+.3f} [{v[1]:+.3f}, {v[2]:+.3f}]")
                if "auc" in rec:
                    L.w("    AUC " + " ".join(f"{m}={v:.3f}" for m, v in rec["auc"].items()))
                L.w(f"    reliability {best}: " + "; ".join(f"{b['bin']}%: n={b['n']} p={b['mean_p']:.2f} obs={b['obs_freq']:.2f}"
                                                      for b in rec["reliability_" + best]))
                L.w(f"    as the page would show it ({best}): " + "; ".join(f"{b['shown']} n={b['n']} obs={b['obs_freq']:.2f}"
                                                                      for b in rec["page_reliability_" + best]))
                L.w(f"    as the page would show it (damp_dress): " + "; ".join(f"{b['shown']} n={b['n']} obs={b['obs_freq']:.2f}"
                                                                        for b in rec["page_reliability_damp_dress"]))
                L.w(f"    reliability {ref}: " + "; ".join(f"{b['bin']}%: n={b['n']} p={b['mean_p']:.2f} obs={b['obs_freq']:.2f}"
                                                     for b in rec["reliability_" + ref]))
    (OUT / "aq_expA_results.json").write_text(json.dumps(clean(res), indent=1, default=str))
    L.w(f"\nwrote {OUT / 'aq_expA_results.json'}")


if __name__ == "__main__":
    main()
