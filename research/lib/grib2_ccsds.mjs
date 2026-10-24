// GRIB2 point reader for ECMWF open-data fields (one GRIB message per buffer), pure Node, no eccodes.
// Supports data representation template 5.42 (CCSDS / AEC, the packing ECMWF's open data uses) and 5.0
// (simple packing), regular lat/lon grids (3.0) only. Written for research/ecmwf_points.mjs (model check of
// 24 Oct 2026) because this host has no eccodes, numpy or pandas; checked against values the earlier study decoded
// with eccodes (research/data/e1e2_daily.csv) — see the log of that run.
//
// The AEC decoder follows CCSDS 121.0-B (Lossless Data Compression) as libaec implements it (decode.c):
// blocks of J samples, a reference sample at the start of every RSI when preprocessing is on, ID options
// low-entropy (zero-block / second-extension), split-sample (k = ID − 1) and uncompressed (all-ones ID);
// then the inverse of the unit-delay predictor and the mapping of CCSDS §4. Unsigned data only.

/** Read the sections of one GRIB2 message: grid (3.0) and packing (5.0 or 5.42), plus the data section offset. */
export function parseGrib2(buf) {
  if (buf.toString("latin1", 0, 4) !== "GRIB" || buf[7] !== 2) throw new Error("not a GRIB2 message");
  let p = 16;
  const out = {};
  while (p < buf.length - 4) {
    if (buf.toString("latin1", p, p + 4) === "7777") break;
    const len = buf.readUInt32BE(p);
    const n = buf[p + 4];
    if (n === 3) {
      const tmpl = buf.readUInt16BE(p + 12);
      if (tmpl !== 0) throw new Error(`grid template 3.${tmpl} not supported`);
      const sm = (o) => { const v = buf.readUInt32BE(p + o); return (v & 0x80000000 ? -(v & 0x7fffffff) : v) / 1e6; };
      out.grid = { npts: buf.readUInt32BE(p + 6), Ni: buf.readUInt32BE(p + 30), Nj: buf.readUInt32BE(p + 34),
        La1: sm(46), Lo1: sm(50), La2: sm(55), Lo2: sm(59), scan: buf[p + 71] };
    } else if (n === 5) {
      const tmpl = buf.readUInt16BE(p + 9);
      const e = buf.readUInt16BE(p + 15);
      const d = buf.readUInt16BE(p + 17);
      const smi = (v) => (v & 0x8000 ? -(v & 0x7fff) : v);
      out.pack = { npts: buf.readUInt32BE(p + 5), tmpl, R: buf.readFloatBE(p + 11), E: smi(e), D: smi(d), nbits: buf[p + 19] };
      if (tmpl === 42) Object.assign(out.pack, { flags: buf[p + 21], block: buf[p + 22], rsi: buf.readUInt16BE(p + 23) });
      else if (tmpl !== 0) throw new Error(`packing template 5.${tmpl} not supported`);
    } else if (n === 6) {
      if (buf[p + 5] !== 255) throw new Error("bitmaps are not supported");
    } else if (n === 7) {
      out.data = { start: p + 5, end: p + len };
    }
    p += len;
  }
  if (!out.grid || !out.pack || !out.data) throw new Error("incomplete GRIB2 message");
  return out;
}

/** Decode CCSDS/AEC-packed unsigned integers up to and including index `upto` (0-based). Returns a Uint32Array. */
export function aecDecode(buf, start, end, { nbits, flags, block: J, rsi }, npts, upto = npts - 1) {
  if (flags & 1) throw new Error("signed AEC data not supported");
  const restricted = (flags & 16) !== 0;
  const pp = (flags & 8) !== 0;
  const padRsi = (flags & 32) !== 0;
  const idLen = nbits > 16 ? 5 : nbits > 8 ? 4 : restricted && nbits <= 4 ? (nbits <= 2 ? 1 : 2) : 3;
  const idMax = (1 << idLen) - 1;
  const need = Math.min(npts, upto + 1);
  const out = new Uint32Array(need + J * rsi); // room for the last whole RSI
  let bitpos = start * 8;
  const endBit = end * 8;
  const bit = () => { const b = (buf[bitpos >>> 3] >>> (7 - (bitpos & 7))) & 1; bitpos++; return b; };
  const bits = (n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 2 + bit(); return v; };
  const fs = () => { let z = 0; while (bit() === 0) { z++; if (bitpos > endBit) throw new Error("AEC: ran past the data"); } return z; };
  // second-extension table (libaec create_se_table)
  const seBeta = [];
  const seMs = [];
  for (let i = 0, k = 0; i < 13; i++) { const ms = k; for (let j = 0; j <= i; j++, k++) { seBeta.push(i); seMs.push(ms); } }
  const xmax = nbits >= 32 ? 0xffffffff : 2 ** nbits - 1;
  const med = Math.floor(xmax / 2) + 1;
  let n = 0; // samples written
  const totalBlocks = Math.ceil(npts / J);
  let blocksDone = 0;
  while (n < need && blocksDone < totalBlocks) {
    // one RSI: rsi blocks of J samples
    const rsiStart = n;
    const rsiBuf = new Array(J * rsi);
    let m = 0; // samples in this RSI's buffer
    let b = 0; // blocks decoded in this RSI
    while (b < rsi && blocksDone + b < totalBlocks) {
      const ref = pp && b === 0 ? 1 : 0;
      const id = bits(idLen);
      if (id === 0) {
        const se = bit();
        if (ref) rsiBuf[m++] = bits(nbits);
        if (se === 1) {
          let i = ref;
          while (i < J) {
            const v = fs();
            if (v > 90) throw new Error("AEC: bad second-extension code");
            const d1 = v - seMs[v];
            if ((i & 1) === 0) { rsiBuf[m++] = seBeta[v] - d1; i++; }
            rsiBuf[m++] = d1; i++;
          }
          b++;
        } else {
          let zb = fs() + 1;
          if (zb === 5) zb = Math.min(rsi - b, 64 - (b % 64)); // ROS: to the end of the 64-block segment or the RSI
          else if (zb > 5) zb--;
          const zs = zb * J - ref;
          for (let i = 0; i < zs; i++) rsiBuf[m++] = 0;
          b += zb;
        }
      } else if (id === idMax) {
        for (let i = 0; i < J; i++) rsiBuf[m++] = bits(nbits);
        b++;
      } else {
        const k = id - 1;
        if (ref) rsiBuf[m++] = bits(nbits);
        const enc = J - ref;
        const base = m;
        for (let i = 0; i < enc; i++) rsiBuf[m++] = fs() * 2 ** k;
        if (k) for (let i = 0; i < enc; i++) rsiBuf[base + i] += bits(k);
        b++;
      }
    }
    // postprocess: inverse prediction and mapping
    if (pp) {
      let data = rsiBuf[0];
      out[n++] = data;
      for (let i = 1; i < m && n < out.length; i++) {
        const d = rsiBuf[i];
        const half = (d >>> 1) + (d & 1);
        const top = data >= med;
        const theta = top ? xmax - data : data;
        if (half <= theta) data += d & 1 ? -((d + 1) / 2) : d / 2;
        else data = top ? xmax - d : d;
        out[n++] = data;
      }
    } else {
      for (let i = 0; i < m && n < out.length; i++) out[n++] = rsiBuf[i];
    }
    blocksDone += b;
    if (padRsi) bitpos = Math.ceil(bitpos / 8) * 8;
    if (n === rsiStart) throw new Error("AEC: no progress");
  }
  return out.subarray(0, need);
}

/** Values (in the field's units) at the given grid indices of one GRIB2 message. */
export function valuesAt(buf, indices) {
  const g = parseGrib2(buf);
  const { pack, data } = g;
  const upto = Math.max(...indices);
  const scale = (x) => (pack.R + x * 2 ** pack.E) / 10 ** pack.D;
  if (pack.nbits === 0) return { meta: g, values: indices.map(() => pack.R / 10 ** pack.D) };
  let raw;
  if (pack.tmpl === 42) {
    const ints = aecDecode(buf, data.start, data.end, pack, pack.npts, upto);
    raw = indices.map((i) => ints[i]);
  } else {
    raw = indices.map((i) => { // simple packing: fixed-width big-endian fields
      let v = 0;
      let bp = data.start * 8 + i * pack.nbits;
      for (let k = 0; k < pack.nbits; k++, bp++) v = v * 2 + ((buf[bp >>> 3] >>> (7 - (bp & 7))) & 1);
      return v;
    });
  }
  return { meta: g, values: raw.map(scale) };
}

/** Nearest grid index of a regular 0.25° global grid that starts at 90N, 180W (ECMWF open data: Lo1 = 180). */
export function gridIndex(lat, lon, grid = { Ni: 1440, La1: 90, Lo1: 180, d: 0.25 }) {
  const j = Math.round((grid.La1 - lat) / grid.d);
  const i = Math.round((((lon - grid.Lo1) % 360) + 360) % 360 / grid.d) % grid.Ni;
  return j * grid.Ni + i;
}
