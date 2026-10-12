// Every icon in every colourway, from the bare glyphs in glyphs/.
//
//   npm run variants
//
// Writes, all at 512 by 512:
//   variants/<colourway>/<app>.png   the card version in another pairing of the brand colours
//   bare/<colour>/<app>.png          only the glyph, with grain and no card, for a tile that is already green
// and preview images in work/. The all-green originals at the top of the repo are not touched.
//
// House rules: ink is never a card, and deep green is never a glyph.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const LIME = [226, 235, 152], SKY = [195, 217, 237], GREEN = [24, 100, 66], INK = [25, 16, 17], COTTON = [244, 242, 234], TILE = [11, 71, 46];
// front card, card behind, glyph
const WAYS = {
  'green-sky': [GREEN, LIME, SKY],
  'green-cotton': [GREEN, SKY, COTTON],
  lime: [LIME, SKY, INK],
  sky: [SKY, LIME, INK],
  cotton: [COTTON, LIME, INK],
};
const BARE = { lime: LIME, sky: SKY, cotton: COTTON };
const names = fs.readdirSync(path.join(root, 'glyphs')).filter((f) => f.endsWith('.png')).map((f) => f.replace('.png', '')).sort();
const TILTS = [-9, 8, -7, 9, 8, -8, 9, -7];

let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
function card(x, y, cx, cy, size, r, deg) {
  const a = (-deg * Math.PI) / 180, dx = x - cx, dy = y - cy, px = Math.abs(dx * Math.cos(a) - dy * Math.sin(a)), py = Math.abs(dx * Math.sin(a) + dy * Math.cos(a)), h = size / 2 - r;
  return r - Math.hypot(Math.max(px - h, 0), Math.max(py - h, 0));
}
const cover = (v) => Math.max(0, Math.min(1, v + .5));
const dark = (c, f) => c.map((v) => v * f);
// half size, each pixel the average of four
function halve(src, S) {
  const out = new PNG({ width: S / 2, height: S / 2 });
  for (let y = 0; y < S / 2; y++) for (let x = 0; x < S / 2; x++) { const di = (y * (S / 2) + x) * 4; let A = 0; const R = [0, 0, 0];
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const si = ((y * 2 + oy) * S + x * 2 + ox) * 4, al = src.data[si + 3]; A += al; for (let k = 0; k < 3; k++) R[k] += src.data[si + k] * al; }
    for (let k = 0; k < 3; k++) out.data[di + k] = A ? R[k] / A : 0; out.data[di + 3] = A / 4; }
  return out;
}
const S = 1024, per = Math.ceil(S / 3);
const done = {}; // key -> 512 png, for the previews

names.forEach((name, n) => {
  const g = PNG.sync.read(fs.readFileSync(path.join(root, 'glyphs', `${name}.png`)));
  const sample = (G, gx0, gy0) => (x, y) => { const u = Math.floor(((x - gx0) / G) * g.width), v = Math.floor(((y - gy0) / G) * g.height); return u < 0 || v < 0 || u >= g.width || v >= g.height ? 0 : g.data[(v * g.width + u) * 4 + 3] / 255; };
  // on a card
  for (const [way, [CARD, BACK, GLYPH]] of Object.entries(WAYS)) {
    const glyph = sample(470, (S - 470) / 2 - 10, (S - 470) / 2 - 8), tilt = TILTS[n % TILTS.length], light = CARD !== GREEN;
    const out = new PNG({ width: S, height: S }), grain = new Float32Array(per * per).map(() => (rnd() + rnd() + rnd()) / 3 - .5);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let c = [0, 0, 0], a = 0;
      const lay = (col, al) => { if (al <= 0) return; const na = al + a * (1 - al); c = c.map((v, k) => (col[k] * al + v * a * (1 - al)) / na); a = na; };
      lay(BACK, cover(card(x, y, 540, 536, 640, 104, tilt)));
      const front = cover(card(x, y, 502, 504, 660, 108, 0));
      lay(dark(BACK, .45), cover(card(x, y, 512, 518, 660, 108, 0)) * .4);
      lay(CARD, front);
      lay([255, 255, 255], front * (y < 340 ? (light ? .18 : .05) : 0));
      lay(dark(CARD, light ? .5 : .28), glyph(x - 16, y - 16) * (light ? .45 : .85) * front); // on a light card the shadow is a soft darker tone, never a green glyph
      lay(GLYPH, glyph(x, y));
      if (a > 0) { const nz = grain[Math.floor(y / 3) * per + Math.floor(x / 3)] * 46 + (rnd() - .5) * 14; c = c.map((v) => Math.max(0, Math.min(255, v + nz))); }
      const i = (y * S + x) * 4; out.data[i] = c[0]; out.data[i + 1] = c[1]; out.data[i + 2] = c[2]; out.data[i + 3] = Math.round(a * 255);
    }
    const small = halve(out, S);
    fs.mkdirSync(path.join(root, 'variants', way), { recursive: true });
    fs.writeFileSync(path.join(root, 'variants', way, `${name}.png`), PNG.sync.write(small));
    done[`${way}/${name}`] = small;
  }
  // bare: the glyph alone, filling the square, with the same grain
  for (const [colour, COL] of Object.entries(BARE)) {
    const glyph = sample(900, 62, 62), out = new PNG({ width: S, height: S }), grain = new Float32Array(per * per).map(() => (rnd() + rnd() + rnd()) / 3 - .5);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const a = glyph(x, y), nz = grain[Math.floor(y / 3) * per + Math.floor(x / 3)] * 46 + (rnd() - .5) * 14, i = (y * S + x) * 4;
      for (let k = 0; k < 3; k++) out.data[i + k] = Math.max(0, Math.min(255, COL[k] + nz));
      out.data[i + 3] = Math.round(a * 255);
    }
    const small = halve(out, S);
    fs.mkdirSync(path.join(root, 'bare', colour), { recursive: true });
    fs.writeFileSync(path.join(root, 'bare', colour, `${name}.png`), PNG.sync.write(small));
    done[`bare-${colour}/${name}`] = small;
  }
  console.log(name);
});

// ---- previews: one row per colourway, on the dashboard's green tiles
function sheet(rows, file, inset) {
  const T = 170, gap = 14, pv = new PNG({ width: names.length * (T + gap) + gap, height: rows.length * (T + gap) + gap });
  for (let i = 0; i < pv.data.length; i += 4) { pv.data[i] = 244; pv.data[i + 1] = 242; pv.data[i + 2] = 234; pv.data[i + 3] = 255; }
  rows.forEach((row, r) => names.forEach((name, n) => { const ic = done[`${row}/${name}`], ox = gap + n * (T + gap), oy = gap + r * (T + gap);
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      if (cover(card(x, y, T / 2, T / 2, T, 22, 0)) < .5) continue;
      const u = Math.floor(((x - inset) / (T - 2 * inset)) * 512), v = Math.floor(((y - inset) / (T - 2 * inset)) * 512), di = ((oy + y) * pv.width + ox + x) * 4;
      let col = TILE;
      if (u >= 0 && v >= 0 && u < 512 && v < 512) { const si = (v * 512 + u) * 4, al = ic.data[si + 3] / 255; col = TILE.map((t, k) => t * (1 - al) + ic.data[si + k] * al); }
      pv.data[di] = col[0]; pv.data[di + 1] = col[1]; pv.data[di + 2] = col[2];
    } }));
  fs.mkdirSync(path.join(root, 'work'), { recursive: true });
  fs.writeFileSync(path.join(root, 'work', file), PNG.sync.write(pv));
}
sheet(Object.keys(WAYS), 'preview-variants.png', 14);
sheet(Object.keys(BARE).map((c) => `bare-${c}`), 'preview-bare.png', 30);
console.log('rows of the card preview:', Object.keys(WAYS).join(', '), '| columns:', names.join(', '));
