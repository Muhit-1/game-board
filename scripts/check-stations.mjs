// Sanity checks for the Scotland Yard station graph: run with `npm run check:stations`.
import fs from 'node:fs';
import ts from 'typescript';

const file = new URL('../src/games/scotland-yard/data/stations.ts', import.meta.url);
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { STATIONS, FERRY_LINKS, MAP_WIDTH, MAP_HEIGHT } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

const errors = [];
const byId = new Map(STATIONS.map((s) => [s.id, s]));

if (STATIONS.length !== 199) errors.push(`expected 199 stations, found ${STATIONS.length}`);
for (let id = 1; id <= 199; id++) if (!byId.has(id)) errors.push(`station ${id} is missing`);

const counts = { taxi: 0, bus: 0, ug: 0 };
for (const s of STATIONS) {
  if (s.x < 0 || s.x > MAP_WIDTH || s.y < 0 || s.y > MAP_HEIGHT) errors.push(`station ${s.id} is outside the map`);
  for (const kind of ['taxi', 'bus', 'ug']) {
    for (const n of s[kind]) {
      counts[kind]++;
      const other = byId.get(n);
      if (!other) errors.push(`${kind}: ${s.id} -> ${n} points at a missing station`);
      else if (!other[kind].includes(s.id)) errors.push(`${kind}: ${s.id} -> ${n} is one-way`);
      if (n === s.id) errors.push(`${kind}: ${s.id} links to itself`);
    }
  }
  if (s.ug.length && !s.bus.length) errors.push(`underground station ${s.id} has no bus link (underground stations are also bus stops)`);
  if (!s.taxi.length && !s.bus.length && !s.ug.length) errors.push(`station ${s.id} has no links`);
}
for (const [a, b] of FERRY_LINKS) if (!byId.has(a) || !byId.has(b)) errors.push(`ferry ${a}-${b} points at a missing station`);

const ugStations = STATIONS.filter((s) => s.ug.length).length;
const busStops = STATIONS.filter((s) => s.bus.length).length;
console.log(`stations ${STATIONS.length} · taxi links ${counts.taxi / 2} · bus links ${counts.bus / 2} · underground links ${counts.ug / 2} · ferries ${FERRY_LINKS.length}`);
console.log(`bus stops ${busStops} (incl. ${ugStations} underground stations)`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('station data OK');
