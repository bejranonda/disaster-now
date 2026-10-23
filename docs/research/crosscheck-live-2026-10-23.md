# Live cross-check of the outputs, 23 Oct 2026 22:06 UTC (24 Oct 05:06 Bangkok)

`node research/crosscheck_live.mjs <collector's live dir> --fw http://127.0.0.1:3000/api/stations`, run on FloodWatch's
server (Germany) against the collector's files of 22:04 UTC. Log: [research/logs/crosscheck-live-2026-10-23.log](../../research/logs/crosscheck-live-2026-10-23.log).
Each section uses the app's own functions on that moment's data.

## A. River gauges vs FloodWatch: not run

ThaiWater answered **HTTP 429** to this server. The same IP runs FloodWatch's collector, which reads ThaiWater every
10 minutes, and this session's live smoke walks had already called it several times. We stopped rather than retry
(KI-029). The last comparison stands: 691 of 693 the same (`research/logs/crosscheck-floodwatch-2026-10-23.log`).

## B. TMD's warning vs the ensemble: they disagree everywhere the warning applies

TMD's CAP notice "พื้นที่เสี่ยงภัยฝนตกหนักบริเวณประเทศไทย" (Heavy Rain, **Severe**, issued 16:43, until 24 Oct 08:00)
covers 11 southern provinces. The app's chance of heavy rain (> 35 mm in 24 h) at each province's centre:

| Province | Heavy-rain chance | Word | Median 24-h rain |
|---|---|---|---|
| Nakhon Si Thammarat | 2 % | low | 13.8 mm |
| Krabi | 2 % | low | 12.3 mm |
| Phuket | 0 % | low | 15.3 mm |
| Surat Thani | 0 % | low | 10.8 mm |
| Songkhla | 2 % | low | 15.9 mm |
| Satun | 6 % | low | 15.9 mm |
| Trang | 6 % | low | 13.8 mm |
| Phatthalung | 8 % | low | 13.5 mm |
| Pattani | 4 % | low | 15.6 mm |
| Yala | 2 % | low | 15.9 mm |
| Narathiwat | 6 % | low | 16.8 mm |

**11 of 11 "low".** TMD warns of heavy rain *somewhere* in a province ("บางแห่ง"); the ensemble's point chance at the
province's centre is a different quantity, and MODELS §3 found the point chance catches about 1 in 8 heavy-rain days.
So this is not proof that either is wrong, but it is exactly the situation the rule "the agency's word leads" exists
for. What a visitor saw before this session's fixes, in Phuket:

- verdict "🌧️ Rain: TMD warning · **Heavy rain: low chance**" — two contradicting claims in one line;
- the 3-day table "ต่ำ ฝนหนัก" for today under a Severe warning.

**Fixed in 0.3.0 (KI-028):** the lifted tile shows the notice's end ("until 08:00 today"), the card says "the model's
numbers below are milder than the notice: follow TMD's notice", and the table's cells for days under a warning read
"📢 เตือนภัย". Tests: `test/audit.test.mjs` "M5/V2", smoke "verdict leads with the warning".

## C. TMD's earthquakes vs EMSC: they agree where both report

10 TMD events (7 days); EMSC had 77 in the region box (M ≥ 2, 8 days). The one event big enough for EMSC's catalogue
matched exactly: **24 Oct 02:31, Laos, TMD M4.2 = EMSC M4.2, 0 km apart.** The other nine are small (M1.6–2.9) local
events in Sukhothai, Chiang Mai, Laos and Myanmar that EMSC doesn't list — TMD's list adds them, as intended.

## D. GISTDA's estimate vs the PCD's stations: still about 1.3× high

GISTDA's 24-h mean at the positions of 30 fresh PCD stations (every 5th of 173 with a reading under 3 h old):
**median ×1.27**, 10–90 % ×0.96…×1.88, over ×1.5 at 9 of 30. The first snapshot (24 Oct 02:00 Bangkok, 60 provinces)
was ×1.31 (KNOWLEDGE §5). Two snapshots three hours apart agree: KI-009 stands, and the owner's D5 (may the estimate
alone raise the verdict?) still matters.

## E. Also seen while walking the live page as a visitor

- **Air4Thai works from this server:** the collector read 173 stations at 21:43 and 22:04 UTC (OWNER_ACTIONS A6's
  "done when": 170 or more). The 503s of the build session were that cloud host's.
- **Heat:** Chiang Mai read "เตือนภัย · บ่ายนี้ 41 °C" (raw ensemble 35.4 °C, corrected by the national fit). The fit
  was validated on held-out stations, but not by region or cool season: MODELS §7 now lists that test.
- **Flood tile:** "ดึงข้อมูลไม่สำเร็จ (429)" in the browser on this server — the same ThaiWater limit as A. A phone has
  its own address; a carrier's shared address might not (KI-011, KI-029).
