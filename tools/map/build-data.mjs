// Builds data.json for the renderer: stations, unique road pairs, and the geography traced from the reference.
// Run by build.mjs (or: node build-data.mjs [geo.json]). Writes data.json next to this file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.resolve(here, '../../src/games/scotland-yard/data/stations.ts'), 'utf8');
const geo = JSON.parse(fs.readFileSync(process.argv[2] ?? path.join(here, 'geo.json'), 'utf8'));

const stations = [...src.matchAll(/\{ id: (\d+), x: (\d+), y: (\d+), taxi: \[([^\]]*)\], bus: \[([^\]]*)\], ug: \[([^\]]*)\]/g)].map((m) => {
  const list = (s) => s.split(',').map((v) => v.trim()).filter(Boolean).map(Number);
  return { id: +m[1], x: +m[2], y: +m[3], taxi: list(m[4]), bus: list(m[5]), ug: list(m[6]) };
});
const ferries = [[108, 115], [115, 157], [157, 194]];

// one road per pair of stations, remembering which transports use it
const roads = new Map();
const add = (a, b, t) => {
  const key = Math.min(a, b) + '-' + Math.max(a, b);
  if (!roads.has(key)) roads.set(key, { a: Math.min(a, b), b: Math.max(a, b), taxi: false, bus: false, ug: false, ferry: false });
  roads.get(key)[t] = true;
};
for (const s of stations) { s.taxi.forEach((n) => add(s.id, n, 'taxi')); s.bus.forEach((n) => add(s.id, n, 'bus')); s.ug.forEach((n) => add(s.id, n, 'ug')); }
ferries.forEach(([a, b]) => add(a, b, 'ferry'));

// river: centre line in displayed overlay px → map units (fitted affine), plus the traced pieces
const toMap = ([x, y]) => [Math.round(1.2849 * x + 17.3), Math.round(1.312 * y + 19.1)];
const center = [[330, 1466], [440, 1452], [560, 1428], [660, 1408], [760, 1400], [860, 1394], [960, 1370], [1040, 1322], [1075, 1262], [1100, 1190], [1120, 1115], [1128, 1040], [1126, 960], [1134, 895], [1148, 830], [1160, 765], [1190, 705], [1250, 668], [1330, 655], [1420, 650], [1520, 655], [1600, 665], [1680, 685], [1760, 710], [1860, 742], [1960, 762], [2040, 775]].map(toMap);

const dropParks = new Set([8, 11, 24]);
const parks = geo.parks.filter((_, i) => !dropParks.has(i));

fs.writeFileSync(path.join(here, 'data.json'), JSON.stringify({
  width: 2600, height: 1940,
  stations: stations.map(({ id, x, y, bus, ug }) => ({ id, x, y, bus: bus.length > 0, ug: ug.length > 0 })),
  roads: [...roads.values()],
  river: { center, width: 96, pieces: geo.river },
  parks,
  landmarks: [
    { type: 'lords', label: 'LORD\'S', x: 319, y: 226, w: 110, d: 70 },
    { type: 'museum', label: 'NATURAL HISTORY MUSEUM', x: 310, y: 1352, w: 110, d: 44 },
    { type: 'albert', label: 'ROYAL ALBERT HALL', x: 160, y: 1318, w: 70, d: 56 },
    { type: 'palace', label: 'BUCKINGHAM PALACE', x: 994, y: 1236, w: 110, d: 48 },
    { type: 'parliament', label: 'HOUSES OF PARLIAMENT', x: 1392, y: 1312, w: 124, d: 40 },
    { type: 'abbey', label: 'WESTMINSTER ABBEY', x: 1304, y: 1318, w: 50, d: 34 },
    { type: 'stpauls', label: 'ST PAUL\'S CATHEDRAL', x: 1945, y: 690, w: 70, d: 46 },
    { type: 'tower_london', label: 'TOWER OF LONDON', x: 2205, y: 880, w: 96, d: 70 },
    { type: 'bt_tower', label: 'BT TOWER', x: 1013, y: 446, w: 24, d: 24 },
    { type: 'tower_bridge', label: 'TOWER BRIDGE', fixed: true, x: 2497, y: 992, w: 30, d: 96 },
  ],
  labels: [
    ["REGENT'S PARK", 814, 176, 13], ['LONDON ZOO', 717, 96, 11],
    ['HYDE PARK', 520, 925, 13], ['KENSINGTON GARDENS', 236, 1069, 12], ['THE SERPENTINE', 544, 1112, 11],
    ['GREEN PARK', 994, 1127, 12], ["ST JAMES'S PARK", 1238, 1121, 12], ['KENNINGTON PARK', 1816, 1751, 12],
  ],
}));
console.log('stations', stations.length, 'roads', roads.size, 'parks', parks.length, 'river pieces', geo.river.length);
