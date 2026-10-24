// Draws the London map and writes the two images the game uses:
//   london-1800.webp (shown first, quick to load) and london-3900.webp (swapped in for zooming).
// Station number tags are NOT drawn here: the game draws them live on top, at the same size (tagScale).
// Usage: npm install && npm run build   (from tools/map)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, Path2D } from '@napi-rs/canvas';

const here = path.dirname(fileURLToPath(import.meta.url));
await import('./build-data.mjs'); // refreshes data.json from the station data and geo.json
const { renderMap } = await import('./render.mjs');
const data = JSON.parse(fs.readFileSync(path.join(here, 'data.json'), 'utf8'));
const out = path.resolve(here, '../../src/games/scotland-yard/board/assets');
fs.mkdirSync(out, { recursive: true });

for (const [name, width] of [['london-1800.webp', 1800], ['london-3900.webp', 3900]]) {
  const started = Date.now();
  const canvas = renderMap(createCanvas, data, { Path2D, scale: width / data.width, drawStations: false, tagScale: 0.85 });
  const buffer = canvas.toBuffer('image/webp', 82);
  fs.writeFileSync(path.join(out, name), buffer);
  console.log(name, `${(buffer.length / 1048576).toFixed(2)} MB`, `${((Date.now() - started) / 1000).toFixed(1)}s`);
}
