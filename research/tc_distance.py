"""Distance from a point to a tropical cyclone's analysed and forecast track.
Reads saved responses (JMA bosai forecast.json, TMD StormTrack JSON, GDACS geometry)
and prints the minimum great-circle distance from each test point.
Usage: python3 -I tc_distance.py <sources_dir>
"""
import json, math, sys, os

R = 6371.0088


def hav(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def bearing(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dl = math.radians(lon2 - lon1)
    y = math.sin(dl) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return math.atan2(y, x)


def seg_dist(plat, plon, alat, alon, blat, blon):
    """Great-circle distance from P to segment AB (km)."""
    d_ap = hav(alat, alon, plat, plon) / R
    d_ab = hav(alat, alon, blat, blon) / R
    if d_ab == 0:
        return d_ap * R
    th_ap = bearing(alat, alon, plat, plon)
    th_ab = bearing(alat, alon, blat, blon)
    xt = math.asin(math.sin(d_ap) * math.sin(th_ap - th_ab))  # cross-track
    at = math.acos(max(-1, min(1, math.cos(d_ap) / math.cos(xt))))  # along-track
    if math.cos(th_ap - th_ab) < 0 or at > d_ab:  # beyond the ends
        return min(d_ap, hav(blat, blon, plat, plon) / R) * R
    return abs(xt) * R


def track_min(pt, path):
    best = (1e9, None)
    for i in range(len(path) - 1):
        d = seg_dist(pt[0], pt[1], *path[i], *path[i + 1])
        if d < best[0]:
            best = (d, i)
    if len(path) == 1:
        best = (hav(pt[0], pt[1], *path[0]), 0)
    return best


def main(src):
    points = {"Bangkok": (13.75, 100.50), "Phuket": (7.88, 98.39), "Ubon": (15.24, 104.85)}
    # JMA: center per part, probabilityCircle radius (m)
    for name in ("jma_tc2637_forecast.b",):
        f = os.path.join(src, name)
        if os.path.exists(f):
            d = json.load(open(f))
            parts = [p for p in d if isinstance(p, dict) and p.get("center")]
            path = [tuple(p["center"]) for p in parts]
            radii = [p.get("probabilityCircle", {}).get("radius", 0) / 1000 for p in parts]
            for k, pt in points.items():
                dmin, i = track_min(pt, path)
                # distance to the edge of each 70% probability circle
                edge = min(hav(*pt, *c) - r for c, r in zip(path, radii))
                print(f"JMA {d[0]['name']['en']}: {k} track {dmin:,.0f} km; nearest circle edge {edge:,.0f} km")
    f = os.path.join(src, "tmd_stormtrack_0.b")
    if os.path.exists(f):
        d = json.load(open(f))
        for s in d["stormTrackingData"]:
            obs = [(p["latitude"], p["longitude"]) for p in s["path"] if not p["isPredictData"]]
            fc = [obs[-1]] + [(p["latitude"], p["longitude"]) for p in s["path"] if p["isPredictData"]]
            for k, pt in points.items():
                print(f"TMD {s['nameEN']}: {k} now {hav(*pt, *obs[-1]):,.0f} km; forecast track {track_min(pt, fc)[0]:,.0f} km")
    f = os.path.join(src, "gdacs_tc_geom.b")
    if os.path.exists(f):
        d = json.load(open(f))
        lines = [ft for ft in d["features"] if ft["geometry"]["type"] == "LineString"]
        fc = [ft for ft in lines if ft["properties"].get("forecast")]
        ob = [ft for ft in lines if not ft["properties"].get("forecast")]
        for k, pt in points.items():
            def mind(fs):
                return min(seg_dist(pt[0], pt[1], c[0][1], c[0][0], c[1][1], c[1][0]) for ft in fs for c in [ft["geometry"]["coordinates"]])
            print(f"GDACS CHAMPI-26: {k} observed {mind(ob):,.0f} km; forecast {mind(fc):,.0f} km ({len(ob)} obs, {len(fc)} forecast segments)")


if __name__ == "__main__":
    main(sys.argv[1])
