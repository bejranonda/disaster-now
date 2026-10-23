// What to do, one sourced line per band: copied word for word from the sister app Hazard-huntz
// (public/content/kit.json → air and hot, v1.13.1, read 23 Oct 2026), with its sources. Never write a new safety
// line here without a source (GUIDELINES rule 1); a hazard without one links to the sister app's guide instead.

export const CITED = {
  "pcd-aqi-2566": { title: "ประกาศกรมควบคุมมลพิษ เรื่อง ดัชนีคุณภาพอากาศของประเทศไทย พ.ศ. 2566 (ราชกิจจานุเบกษา)",
    url: "https://ratchakitcha.soc.go.th/documents/140D157S0000000000300.pdf", date: "2023-07-03", kind: "official" },
  "pcd-aqi-thaipbs-2566": { title: "ไทยพีบีเอส อ้างอธิบดีกรมควบคุมมลพิษ: ประกาศใหม่ AQI", url: "https://www.thaipbs.or.th/news/content/329386", date: "2023-07-05", kind: "secondary" },
  "doh-heatlevels-2569": { title: "เดลินิวส์ อ้างอธิบดีกรมอนามัย: เตือนอากาศร้อนรุนแรง", url: "https://www.dailynews.co.th/news/5756174/", date: "2026-04-07", kind: "secondary" },
  "bma-heat-posttoday-2569": { title: "โพสต์ทูเดย์ อ้างกรุงเทพมหานคร: ค่าดัชนีความร้อน", url: "https://www.posttoday.com/general-news/740308", date: "2026-04-02", kind: "secondary" },
  "ddc-mask-2568": { title: "อินโฟเควสท์ อ้างโฆษกกระทรวงสาธารณสุขและโฆษกกรมควบคุมโรค: ใส่ Mask ให้ถูกต้อง", url: "https://www.infoquest.co.th/2025/464667", date: "2025-01-27", kind: "secondary" },
  "doh-dustroom-2569": { title: "The Standard อ้างกรมอนามัย: 6 วิธีทำห้องปลอดฝุ่นในบ้าน", url: "https://thestandard.co/pm25-dust-free-room-thailand-tips/", date: "2026-04-01", kind: "secondary" },
  "hc-respirator-2569": { title: "Health Canada: Using a respirator mask during wildfire smoke events", url: "https://www.canada.ca/en/public-health/services/publications/healthy-living/using-respirator-mask-during-wildfire-smoke-events.html", date: "2026-10-06", kind: "international" },
  "tmd-heatindex-posttoday-2567": { title: "โพสต์ทูเดย์: ดัชนีความร้อน ตัวชี้วัดอุณหภูมิ", url: "https://www.posttoday.com/smart-life/706574", date: "2024-03-11", kind: "secondary" },
};

// PM2.5 by PCD band (24-hour mean), the line for everyone
const PM = [
  { upto: 15.0, th: "ใช้ชีวิตได้ตามปกติ", en: "Go about life as normal" },
  { upto: 25.0, th: "ทำกิจกรรมนอกบ้านได้ตามปกติ", en: "Outdoor activities as normal" },
  { upto: 37.5, th: "ออกกำลังหนักๆ นอกบ้านให้น้อยลง", en: "Do less hard exercise or work outdoors" },
  { upto: 75.0, th: "ใส่หน้ากากกันฝุ่น PM2.5 ทุกครั้งที่ออกนอกบ้าน", en: "Wear a PM2.5 mask every time you go out", mask: true },
  { upto: Infinity, th: "งดทำกิจกรรมนอกบ้าน", en: "No outdoor activities" },
].map((x) => ({ ...x, src: ["pcd-aqi-2566", "pcd-aqi-thaipbs-2566"] }));

// Heat index by TMD/DOH band
const HEAT = [
  { upto: 26.9, th: null, en: null, src: [] },
  { upto: 32.9, th: "ดื่มน้ำสะอาดบ่อยๆ ไม่ต้องรอให้กระหาย", en: "Drink clean water often, without waiting to feel thirsty", src: ["doh-heatlevels-2569", "bma-heat-posttoday-2569", "tmd-heatindex-posttoday-2567"] },
  { upto: 41.9, th: "ลดกิจกรรมกลางแดด", en: "Spend less time active in the sun", src: ["bma-heat-posttoday-2569", "doh-heatlevels-2569"] },
  { upto: 51.9, th: "หลีกเลี่ยงแดด ย้ายกิจกรรมไปช่วงที่ไม่ร้อน", en: "Keep out of the sun; move activities to a cooler time", src: ["doh-heatlevels-2569"] },
  { upto: Infinity, th: "งดกิจกรรมกลางแจ้ง", en: "Stop outdoor activity", src: ["bma-heat-posttoday-2569", "doh-heatlevels-2569"] },
];

// Hazard-huntz kit.json → air.baby (v1.11.1, F129): a mask line never goes out without it (verify: partial — a
// paediatrician should confirm; the DDC spokesperson and Health Canada agree on no mask under 2)
export const BABY = { th: "เด็กต่ำกว่า 2 ขวบ ไม่ควรใส่หน้ากากทุกชนิด ให้อยู่ในห้องที่กันฝุ่นได้ และอย่าพาไปที่ฝุ่นเยอะ",
  en: "Children under 2 shouldn’t wear any kind of mask: keep them in a room that keeps the dust out, and away from dusty places",
  src: ["ddc-mask-2568", "doh-dustroom-2569", "hc-respirator-2569"] };

/** The sourced line for a value, or null. A line that tells people to wear a mask carries `baby`. */
export function actionFor(hazard, value, lang = "th") {
  const table = hazard === "pm25" ? PM : hazard === "heat" ? HEAT : null;
  if (!table || value == null) return null;
  const v = Math.round(value * 10) / 10;
  const row = table.find((r) => v <= r.upto);
  if (!row || !row.th) return null;
  return { text: lang === "en" ? row.en : row.th, src: row.src.map((id) => ({ id, ...CITED[id] })),
    baby: row.mask ? { text: lang === "en" ? BABY.en : BABY.th, src: BABY.src.map((id) => ({ id, ...CITED[id] })) } : null };
}
