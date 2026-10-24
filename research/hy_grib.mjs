// Hat Yai hindcast (2026-10-24): read a GRIB2 field's values at a few grid points from only the FIRST part of the
// message. ECMWF open data scans from 90 N southward, so southern Thailand (rows down to ~6 N) sits in the first
// ~half of each field: a byte-range request for that part is enough. The AEC decoder is research/lib/grib2_ccsds.mjs's
// (validated against eccodes in an earlier study), copied with one change: reading past the bytes we have throws
// `Truncated` instead of returning zeros, so a short read is never decoded as data. The caller then fetches more.
// Checked against the library's full-message decode in research/logs/hy_fetch_ens_tp-2026-10-24.log (selftest).
import { parseGrib2 } from "./lib/grib2_ccsds.mjs";

export class Truncated extends Error {}

/** The sections of a message that may be cut short inside section 7 (data). */
export function parsePartial(buf) {
  if (buf.toString("latin1", 0, 4) !== "GRIB" || buf[7] !== 2) throw new Error("not a GRIB2 message");
  const total = Number(buf.readBigUInt64BE(8));
  let p = 16;
  // walk to section 7 using the declared lengths; everything before section 7 must be in the buffer
  const out = {};
  while (p < buf.length - 5) {
    const len = buf.readUInt32BE(p);
    const n = buf[p + 4];
    if (n === 7) { out.dataStart = p + 5; out.dataEnd = p + len; break; }
    if (p + len > buf.length) throw new Truncated("header past the buffer");
    p += len;
  }
  if (out.dataStart == null) throw new Truncated("no section 7 yet");
  // reuse the library's section reader on a synthetic, complete message: sections 0-6 + an empty section 7 + 7777
  const head = buf.subarray(0, out.dataStart - 5);
  const s7 = Buffer.alloc(5); s7.writeUInt32BE(5, 0); s7[4] = 7;
  const g = parseGrib2(Buffer.concat([head, s7, Buffer.from("7777", "latin1")]));
  return { grid: g.grid, pack: g.pack, data: { start: out.dataStart, end: out.dataEnd }, total };
}

/** libaec-style CCSDS decoder (grib2_ccsds.mjs aecDecode) that throws Truncated at the end of the bytes we hold. */
function aecDecodeStrict(buf, start, end, { nbits, flags, block: J, rsi }, npts, upto) {
  if (flags & 1) throw new Error("signed AEC data not supported");
  const restricted = (flags & 16) !== 0;
  const pp = (flags & 8) !== 0;
  const padRsi = (flags & 32) !== 0;
  const idLen = nbits > 16 ? 5 : nbits > 8 ? 4 : restricted && nbits <= 4 ? (nbits <= 2 ? 1 : 2) : 3;
  const idMax = (1 << idLen) - 1;
  const need = Math.min(npts, upto + 1);
  const out = new Uint32Array(need + J * rsi);
  let bitpos = start * 8;
  const endBit = Math.min(end, buf.length) * 8; // the change: the bytes we have, not the bytes declared
  const bit = () => { if (bitpos >= endBit) throw new Truncated("AEC: past the fetched bytes"); const b = (buf[bitpos >>> 3] >>> (7 - (bitpos & 7))) & 1; bitpos++; return b; };
  const bits = (n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 2 + bit(); return v; };
  const fs = () => { let z = 0; while (bit() === 0) z++; return z; };
  const seBeta = [];
  const seMs = [];
  for (let i = 0, k = 0; i < 13; i++) { const ms = k; for (let j = 0; j <= i; j++, k++) { seBeta.push(i); seMs.push(ms); } }
  const xmax = nbits >= 32 ? 0xffffffff : 2 ** nbits - 1;
  const med = Math.floor(xmax / 2) + 1;
  let n = 0;
  const totalBlocks = Math.ceil(npts / J);
  let blocksDone = 0;
  while (n < need && blocksDone < totalBlocks) {
    const rsiStart = n;
    const rsiBuf = new Array(J * rsi);
    let m = 0;
    let b = 0;
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
          if (zb === 5) zb = Math.min(rsi - b, 64 - (b % 64));
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
  return { ints: out.subarray(0, need), usedBytes: Math.ceil(bitpos / 8) };
}

/** Values at grid indices from a possibly truncated message; throws Truncated when more bytes are needed. */
export function valuesAtPartial(buf, indices) {
  const g = parsePartial(buf);
  const { pack, data } = g;
  const upto = Math.max(...indices);
  const scale = (x) => (pack.R + x * 2 ** pack.E) / 10 ** pack.D;
  if (pack.nbits === 0) return { meta: g, values: indices.map(() => pack.R / 10 ** pack.D), usedBytes: data.start };
  if (pack.tmpl !== 42) throw new Error(`packing 5.${pack.tmpl}: partial reads need AEC (5.42)`);
  const { ints, usedBytes } = aecDecodeStrict(buf, data.start, data.end, pack, pack.npts, upto);
  return { meta: g, values: indices.map((i) => scale(ints[i])), usedBytes };
}
