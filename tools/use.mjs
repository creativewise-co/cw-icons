// Switches which style the links serve.
//
//   npm run use cotton     the glyph alone in cotton, no card
//   npm run use card       the green card (the original)
//
// The icons at the top of the repo (games.png, vpn.png, ...) are the ones the
// dashboard links to. They are copies of one of two sets, card/ or
// bare/cotton/. This copies the set you name over them and notes which one
// is in use in CURRENT. Commit and push afterwards; GitHub can take about
// five minutes to serve the new files.
//
// (Real symlinks would be neater, but GitHub serves a symlink as a line of
// text, not as the picture it points to, so the files are copied instead.)
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SETS = { card: 'card', cotton: path.join('bare', 'cotton') };
const want = process.argv[2];
if (!SETS[want]) { console.error(`Say which: ${Object.keys(SETS).join(' or ')}. In use now: ${fs.readFileSync(path.join(root, 'CURRENT'), 'utf8').trim()}`); process.exit(1); }
const names = fs.readdirSync(path.join(root, 'card')).filter((f) => f.endsWith('.png'));
const missing = names.filter((f) => !fs.existsSync(path.join(root, SETS[want], f)));
if (missing.length) { console.error(`Not switching: ${SETS[want]} has no ${missing.join(', ')}`); process.exit(1); }
for (const f of names) fs.copyFileSync(path.join(root, SETS[want], f), path.join(root, f));
fs.writeFileSync(path.join(root, 'CURRENT'), `${want}\n`);
console.log(`${names.length} icons at the top of the repo are now the ${want} set. Commit and push to make it live.`);
