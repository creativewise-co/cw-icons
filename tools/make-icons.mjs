// Makes dashboard icons in the house style.
//
//   npm run ideas -- work/motion tools/ideas/motion.json
//
// It asks an image model for a sheet of one-colour glyphs (the ideas in the
// JSON file: a grid, and one line per glyph), cuts each glyph out, and sets
// it on the green card: a sky card tilted behind, a hard shadow, print grain.
// Everything lands in the folder you name: <idea>.png at 1024, 512/<idea>.png,
// the bare glyphs, and preview.png showing them all on dashboard tiles.
// Pick one and copy it to the top of the repo under the app's name.
//
// Needs OPENROUTER_API_KEY_GAMES (it reads the game hub's .env.local).
// With --compose it skips the drawing and only re-sets glyphs already cut.
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const [,, outDir, ideasFile, flag] = process.argv;
if (!outDir || !ideasFile) { console.error('usage: make-icons.mjs <out-dir> <ideas.json> [--compose]'); process.exit(1); }
const ideas = JSON.parse(fs.readFileSync(ideasFile, 'utf8'));
const { cols, rows, about, glyphs } = ideas; // glyphs: [[name, what to draw], ...]
fs.mkdirSync(path.join(outDir, 'glyphs'), { recursive: true });
fs.mkdirSync(path.join(outDir, '512'), { recursive: true });

const LIME = [226, 235, 152], SKY = [195, 217, 237], CARD = [24, 100, 66], SHADE = [6, 46, 30], TILE = [11, 71, 46];

// ---- 1. the glyphs: drawn on magenta, in one colour
if (flag !== '--compose') {
  const key = process.env.OPENROUTER_API_KEY_GAMES;
  if (!key) { console.error('Set OPENROUTER_API_KEY_GAMES first.'); process.exit(1); }
  const prompt = `A sheet of ${glyphs.length} app icons, as flat one-colour glyphs, on a strict grid of ${cols} columns and ${rows} rows, one glyph per cell, centred, filling about 60% of its cell, never touching the cell edge. ${about}
The glyphs, in reading order, left to right and top row first:
${glyphs.map(([, say], i) => `${i + 1}. ${say}`).join('\n')}
Style: bold, simple, solid glyph icons like a modern app icon set. STRICTLY ONE COLOUR: every glyph is a single flat pale lime #E2EB98 shape. Any inner detail is a cut-out gap that shows the background through, never a second colour. No white, no dark green, no gradients, no shadows, no 3D, no texture. Thick rounded shapes, no thin lines. No brand logos. All of them clearly belong to one family: same weight, same roundness, same level of detail.
Background: flat pure magenta #FF00FF everywhere, and nothing else: no tiles, no rounded squares, no grid lines, no labels, no text, no letters, no numbers.`;
  const res = await fetch('https://openrouter.ai/api/v1/images', { method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'google/gemini-3-pro-image', n: 1, aspect_ratio: cols / rows > 1.6 ? '16:9' : cols / rows > 1.2 ? '4:3' : '1:1', resolution: '2K', output_format: 'png', prompt }),
    signal: AbortSignal.timeout(240000) });
  const body = await res.json();
  if (!body?.data?.[0]?.b64_json) { console.error(JSON.stringify(body).slice(0, 300)); process.exit(1); }
  const buf = Buffer.from(body.data[0].b64_json, 'base64');
  fs.writeFileSync(path.join(outDir, 'sheet.png'), buf);
  console.log('drawn, cost', body.usage?.cost);

  const p = PNG.sync.read(buf), d = p.data, W = p.width, H = p.height;
  // how magenta a pixel is becomes how see-through it is, so edges stay soft
  const alpha = new Float32Array(W * H);
  for (let i = 0, k = 0; i < d.length; i += 4, k++) alpha[k] = d[i + 1] > 200 ? 1 : 1 - Math.max(0, Math.min(1, ((d[i] + d[i + 2]) / 2 - d[i + 1]) / 120));
  const cw = W / cols, ch = H / rows, S = 512;
  glyphs.forEach(([name], n) => {
    const x0 = Math.round((n % cols) * cw), y0 = Math.round(Math.floor(n / cols) * ch);
    let l = cw, t = ch, r = 0, b = 0;
    for (let y = 8; y < ch - 8; y++) for (let x = 8; x < cw - 8; x++) if (alpha[(y0 + y) * W + x0 + x] > .5) { l = Math.min(l, x); r = Math.max(r, x); t = Math.min(t, y); b = Math.max(b, y); }
    const side = Math.max(r - l, b - t) * 1.18, cx = (l + r) / 2, cy = (t + b) / 2, k = side / S;
    const out = new PNG({ width: S, height: S });
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      let A = 0;
      for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) {
        const sx = Math.round(x0 + cx - side / 2 + (x + (c + .5) / 3) * k), sy = Math.round(y0 + cy - side / 2 + (y + (a + .5) / 3) * k);
        if (sx < x0 + 4 || sy < y0 + 4 || sx >= x0 + cw - 4 || sy >= y0 + ch - 4) continue;
        A += alpha[sy * W + sx];
      }
      const di = (y * S + x) * 4;
      out.data[di] = LIME[0]; out.data[di + 1] = LIME[1]; out.data[di + 2] = LIME[2]; out.data[di + 3] = Math.round((A / 9) * 255);
    }
    fs.writeFileSync(path.join(outDir, 'glyphs', `${name}.png`), PNG.sync.write(out));
  });
}

// ---- 2. each glyph on its card
const S = 1024;
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); // the same grain every run
// how far inside a rounded square a point is, in pixels, with the square turned by `deg`
function card(x, y, cx, cy, size, r, deg) {
  const a = (-deg * Math.PI) / 180, dx = x - cx, dy = y - cy, px = Math.abs(dx * Math.cos(a) - dy * Math.sin(a)), py = Math.abs(dx * Math.sin(a) + dy * Math.cos(a));
  const h = size / 2 - r;
  return r - Math.hypot(Math.max(px - h, 0), Math.max(py - h, 0));
}
const cover = (v) => Math.max(0, Math.min(1, v + .5));
const TILTS = [-9, 8, -7, 9, 8, -8, 9, -7];
const made = [];
glyphs.forEach(([name], n) => {
  const g = PNG.sync.read(fs.readFileSync(path.join(outDir, 'glyphs', `${name}.png`))), G = 470, gx0 = (S - G) / 2 - 10, gy0 = (S - G) / 2 - 8, tilt = TILTS[n % TILTS.length];
  const glyph = (x, y) => { const u = Math.floor(((x - gx0) / G) * g.width), v = Math.floor(((y - gy0) / G) * g.height); return u < 0 || v < 0 || u >= g.width || v >= g.height ? 0 : g.data[(v * g.width + u) * 4 + 3] / 255; };
  const out = new PNG({ width: S, height: S }), per = Math.ceil(S / 3);
  const grain = new Float32Array(per * per).map(() => (rnd() + rnd() + rnd()) / 3 - .5); // coarse, like ink on paper
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let c = [0, 0, 0], a = 0;
    const lay = (col, al) => { if (al <= 0) return; const na = al + a * (1 - al); c = c.map((v, k) => (col[k] * al + v * a * (1 - al)) / na); a = na; };
    lay(SKY, cover(card(x, y, 540, 536, 640, 104, tilt)));           // the card behind, turned
    const front = cover(card(x, y, 502, 504, 660, 108, 0));
    lay(SHADE, cover(card(x, y, 512, 518, 660, 108, 0)) * .35);      // the front card's shadow on it
    lay(CARD, front);
    lay([255, 255, 255], front * (y < 340 ? .05 : 0));               // a lighter band across the top, like a panel
    lay(SHADE, glyph(x - 16, y - 16) * .85 * front);                 // the glyph's hard shadow
    lay(LIME, glyph(x, y));
    if (a > 0) { const nz = grain[Math.floor(y / 3) * per + Math.floor(x / 3)] * 46 + (rnd() - .5) * 14; c = c.map((v) => Math.max(0, Math.min(255, v + nz))); }
    const i = (y * S + x) * 4; out.data[i] = c[0]; out.data[i + 1] = c[1]; out.data[i + 2] = c[2]; out.data[i + 3] = Math.round(a * 255);
  }
  fs.writeFileSync(path.join(outDir, `${name}.png`), PNG.sync.write(out));
  // half size, each pixel the average of four
  const half = new PNG({ width: 512, height: 512 });
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) { const di = (y * 512 + x) * 4; let A = 0, R = [0, 0, 0];
    for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const si = ((y * 2 + oy) * S + x * 2 + ox) * 4, al = out.data[si + 3]; A += al; for (let k = 0; k < 3; k++) R[k] += out.data[si + k] * al; }
    for (let k = 0; k < 3; k++) half.data[di + k] = A ? R[k] / A : 0; half.data[di + 3] = A / 4; }
  fs.writeFileSync(path.join(outDir, '512', `${name}.png`), PNG.sync.write(half));
  made.push(out);
});

// ---- 3. how they look on the dashboard's tiles
const T = 300, PER = Math.min(4, made.length), pv = new PNG({ width: PER * (T + 24) + 24, height: Math.ceil(made.length / PER) * (T + 24) + 24 });
for (let i = 0; i < pv.data.length; i += 4) { pv.data[i] = 244; pv.data[i + 1] = 242; pv.data[i + 2] = 234; pv.data[i + 3] = 255; }
made.forEach((ic, n) => { const ox = 24 + (n % PER) * (T + 24), oy = 24 + Math.floor(n / PER) * (T + 24);
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    if (cover(card(x, y, T / 2, T / 2, T, 36, 0)) < .5) continue;
    const u = Math.floor(((x - 40) / (T - 80)) * S), v = Math.floor(((y - 30) / (T - 80)) * S), di = ((oy + y) * pv.width + ox + x) * 4;
    let col = TILE;
    if (u >= 0 && v >= 0 && u < S && v < S) { const si = (v * S + u) * 4, al = ic.data[si + 3] / 255; col = TILE.map((t, k) => t * (1 - al) + ic.data[si + k] * al); }
    pv.data[di] = col[0]; pv.data[di + 1] = col[1]; pv.data[di + 2] = col[2];
  } });
fs.writeFileSync(path.join(outDir, 'preview.png'), PNG.sync.write(pv));
console.log(glyphs.map((g) => g[0]).join(', '));
