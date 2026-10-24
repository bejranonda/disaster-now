"""The seismic zones of Thailand's Ministerial Regulation B.E. 2564 (2021), province by province, from the Royal
Gazette's own PDF.

Run:  nice -n 19 <venv>/bin/python -I research/eq_zones_2564.py
Source: กฎกระทรวงกำหนดการรับน้ำหนัก ความต้านทาน ความคงทนของอาคาร และพื้นดินที่รองรับอาคารในการต้านทาน
แรงสั่นสะเทือนของแผ่นดินไหว พ.ศ. ๒๕๖๔, ราชกิจจานุเบกษา เล่ม ๑๓๘ ตอนที่ ๑๖ ก หน้า ๑๓-๑๔, ๔ มีนาคม ๒๕๖๔,
https://ratchakitcha.soc.go.th/documents/17159461.pdf (read 2026-10-24), clause (ข้อ) ๓.

How the names were read (no name comes from memory or a secondary source):
1. The PDF is downloaded (honest User-Agent, cached) to research/data/eq_zones_src/17159461.pdf; its SHA-256 is logged.
2. Pages 1-2 were rendered with Ghostscript at 240 dpi and clause 3 was read from the images (crops kept in
   research/data/eq_zones_src/clause3_*.png); TRANSCRIPTION below is that reading.
3. Cross-check against the PDF's own text layer (Ghostscript txtwrite). The text layer's Thai font map is broken in a
   regular way: it gives "ำ" (sara am) for "า" (sara aa), "้ำ" for "ำ", and a space for the "้" in "พื้น". So the
   check compares both after one normalisation, N(s) = drop "้", map "ำ" to "า", drop spaces and quotes. Every
   consonant, every other vowel and mark, and the order of the names must agree; only "า"/"ำ" and "้" rest on the
   image reading alone. The run fails if anything differs.
Writes research/data/eq_zones_2564.json and research/logs/eq_zones_2564-2026-10-24.log.
"""
from __future__ import annotations

import hashlib
import json
import pathlib
import re
import subprocess
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from eq_common import DATA, Log, get  # noqa: E402

L = Log("eq_zones_2564")
URL = "https://ratchakitcha.soc.go.th/documents/17159461.pdf"
SRC = DATA / "eq_zones_src"
SRC.mkdir(parents=True, exist_ok=True)
PDF = SRC / "17159461.pdf"

# Clause 3, as read from the rendered pages (Royal Gazette p. 13 bottom to p. 14 top). Line breaks are the page's.
TRANSCRIPTION = {
    "1": ("“บริเวณที่ ๑” หมายความว่า บริเวณหรือพื้นที่ที่ต้องเฝ้าระวังเนื่องจากมีความเป็นไปได้ว่า"
          "อาคารอาจได้รับผลกระทบทางด้านความมั่นคงแข็งแรงและเสถียรภาพเมื่อมีแรงสั่นสะเทือน"
          "ของแผ่นดินไหว ได้แก่ จังหวัดกระบี่ จังหวัดชุมพร จังหวัดตรัง จังหวัดนครพนม จังหวัดนครศรีธรรมราช "
          "จังหวัดบึงกาฬ จังหวัดประจวบคีรีขันธ์ จังหวัดพิษณุโลก จังหวัดเพชรบุรี จังหวัดเลย จังหวัดสงขลา "
          "จังหวัดสตูล จังหวัดสุราษฎร์ธานี และจังหวัดหนองคาย"),
    "2": ("“บริเวณที่ ๒” หมายความว่า บริเวณหรือพื้นที่ที่มีความเป็นไปได้ว่าอาคารอาจได้รับ"
          "ผลกระทบทางด้านความมั่นคงแข็งแรงและเสถียรภาพในระดับปานกลางเมื่อมีแรงสั่นสะเทือน"
          "ของแผ่นดินไหว ได้แก่ กรุงเทพมหานคร จังหวัดกำแพงเพชร จังหวัดชัยนาท จังหวัดนครปฐม "
          "จังหวัดนครสวรรค์ จังหวัดนนทบุรี จังหวัดปทุมธานี จังหวัดพระนครศรีอยุธยา จังหวัดพังงา "
          "จังหวัดภูเก็ต จังหวัดระนอง จังหวัดราชบุรี จังหวัดสมุทรปราการ จังหวัดสมุทรสงคราม "
          "จังหวัดสมุทรสาคร จังหวัดสุพรรณบุรี และจังหวัดอุทัยธานี"),
    "3": ("“บริเวณที่ ๓” หมายความว่า บริเวณหรือพื้นที่ที่มีความเป็นไปได้ว่าอาคารอาจได้รับ"
          "ผลกระทบทางด้านความมั่นคงแข็งแรงและเสถียรภาพในระดับสูงเมื่อมีแรงสั่นสะเทือนของแผ่นดินไหว"
          "ได้แก่ จังหวัดกาญจนบุรี จังหวัดเชียงราย จังหวัดเชียงใหม่ จังหวัดตาก จังหวัดน่าน จังหวัดพะเยา "
          "จังหวัดแพร่ จังหวัดแม่ฮ่องสอน จังหวัดลำปาง จังหวัดลำพูน จังหวัดสุโขทัย และจังหวัดอุตรดิตถ์"),
}


def items(text: str) -> list[str]:
    """The listed places after 'ได้แก่', as written (with 'จังหวัด'), without the conjunction 'และ'."""
    tail = text.split("ได้แก่", 1)[1]
    out = []
    for tok in tail.split():
        tok = tok[3:] if tok.startswith("และ") else tok
        if tok.startswith("จังหวัด") or tok.startswith("กรุงเทพ"):
            out.append(tok)
    return out


def norm(s: str) -> str:
    return re.sub(r"[\s“”\"]", "", s.replace("้", "").replace("ำ", "า"))


# 1. the official PDF
b = get(URL, binary=True)
PDF.write_bytes(b)
L(f"source: {URL}")
L(f"downloaded {len(b)} bytes, SHA-256 {hashlib.sha256(b).hexdigest()}")

# 2. the text layer, for the cross-check
txt_path = SRC / "text_layer_p1-2.txt"
subprocess.run(["gs", "-q", "-dSAFER", "-dBATCH", "-dNOPAUSE", "-sDEVICE=txtwrite", "-dFirstPage=1", "-dLastPage=2",
                f"-sOutputFile={txt_path}", str(PDF)], check=False, capture_output=True)
layer = " ".join(line.strip() for line in txt_path.read_text(encoding="utf-8", errors="replace").splitlines())
# the running header of page 14 ("หน้า ๑๔ เล่ม ๑๓๘ ตอนที่ ๑๖ ก ราชกิจจานุเบกษา ๔ มีนาคม ๒๕๖๔") falls inside zone 2's list
# in the text layer; it is removed before the comparison (and logged)
headers = re.findall(r"หนา\s+[๐-๙]+\s+้?\s*เลม.*?๒๕๖๔\s*่?", layer)
L(f"running page headers removed from the text layer: {len(headers)} -> {[re.sub(r'\s+', ' ', h) for h in headers]}")
layer = re.sub(r"หนา\s+[๐-๙]+\s+้?\s*เลม.*?๒๕๖๔\s*่?", " ", layer)
L(f"after removal, 'ข้อ ๓' (clause 3) found in the text layer: {bool(re.search(r'ข\S*อ\s+๓', layer))}")

# split the layer's clause 3 into the three definitions
parts = {}
for z, nxt in (("๑", "“บริเวณที่  ๒”"), ("๒", "“บริเวณที่  ๓”"), ("๓", "“ผู้ออกแบบ”")):
    start = layer.index(f"“บริเวณที่  {z}”")
    parts[{"๑": "1", "๒": "2", "๓": "3"}[z]] = layer[start:layer.index(nxt, start)]

ok = True
zones, as_written = {}, {}
for z in ("1", "2", "3"):
    mine, theirs = TRANSCRIPTION[z], parts[z]
    L(f"\n== clause 3, zone {z}: as read from the rendered page ==\n{mine}")
    L(f"-- the PDF's text layer (broken font map) --\n{theirs.strip()}")
    same_text = norm(mine) == norm(theirs)
    a, t = items(mine), items(theirs)
    same_items = len(a) == len(t) and all(norm(x) == norm(y) for x, y in zip(a, t))
    L(f"cross-check: whole definition {'MATCHES' if same_text else 'DIFFERS'}; list of {len(a)} vs {len(t)} names "
      f"{'MATCHES' if same_items else 'DIFFERS'} (after N)")
    ok = ok and same_text and same_items
    as_written[z] = a
    zones[z] = [x[len("จังหวัด"):] if x.startswith("จังหวัด") else x for x in a]
if not ok:
    L("\nSTOP: the reading and the PDF's text layer disagree; nothing written.")
    sys.exit(1)

n = {z: len(v) for z, v in zones.items()}
allp = [p for v in zones.values() for p in v]
L(f"\ncounts: zone 1 = {n['1']}, zone 2 = {n['2']}, zone 3 = {n['3']}, total {sum(n.values())}, "
  f"distinct {len(set(allp))}")
for z in ("1", "2", "3"):
    L(f"zone {z}: " + ", ".join(zones[z]))

# the app's own province names (public/data/tambon.json, HDX COD-AB), to show the names can be matched
tj = json.loads((DATA.parent.parent / "public/data/tambon.json").read_text())
names = {v[0]: k for k, v in tj["p"].items()}
miss = [p for p in allp if p not in names]
L(f"names found verbatim in public/data/tambon.json's province list: {len(allp) - len(miss)} of {len(allp)}"
  + (f"; not found: {miss}" if miss else ""))

out = {
    "source": URL,
    "read": "2026-10-24",
    "title": "กฎกระทรวงกำหนดการรับน้ำหนัก ความต้านทาน ความคงทนของอาคาร และพื้นดินที่รองรับอาคารในการต้านทาน"
             "แรงสั่นสะเทือนของแผ่นดินไหว พ.ศ. ๒๕๖๔",
    "gazette": "ราชกิจจานุเบกษา เล่ม ๑๓๘ ตอนที่ ๑๖ ก หน้า ๑๓-๑๔ วันที่ ๔ มีนาคม ๒๕๖๔, ข้อ ๓",
    "zone_words": {"1": "บริเวณหรือพื้นที่ที่ต้องเฝ้าระวัง", "2": "ในระดับปานกลาง", "3": "ในระดับสูง"},
    "note": "zones: names with the word 'จังหวัด' (province) removed; as_written: exactly as listed in clause 3. "
            "Read from the rendered pages and checked against the PDF's text layer (eq_zones_2564.py).",
    "zones": zones,
    "as_written": as_written,
    "province_codes": {z: [names.get(p) for p in v] for z, v in zones.items()},
}
(DATA / "eq_zones_2564.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
L("\nwrote research/data/eq_zones_2564.json")
