import { FERRY_LINKS, MAP_HEIGHT, MAP_WIDTH, STATIONS } from '../data/stations';
import type { StationData } from '../data/stations';
import { STATION_BY_ID } from '../data/graph';
import type { Transport } from '../types';

/**
 * The illustrated London map, drawn in code (the original board's artwork is not used): a warm ground, the river,
 * parks with trees and thousands of small orange-roofed buildings placed only where no road passes. Painted once
 * into a bitmap and cached; the roads, stations and pieces are drawn on top as crisp SVG.
 */
export interface MapEdge {
  transport: Transport;
  a: StationData;
  b: StationData;
}

/** Every link once (two-way links are listed once), in a stable order. */
export const MAP_EDGES: MapEdge[] = (() => {
  const edges: MapEdge[] = [];
  const seen = new Set<string>();
  const add = (transport: Transport, aId: number, bId: number) => {
    const key = `${transport}:${Math.min(aId, bId)}-${Math.max(aId, bId)}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ transport, a: STATION_BY_ID.get(aId)!, b: STATION_BY_ID.get(bId)! });
  };
  STATIONS.forEach((s) => {
    s.taxi.forEach((n) => add('taxi', s.id, n));
    s.bus.forEach((n) => add('bus', s.id, n));
    s.ug.forEach((n) => add('ug', s.id, n));
  });
  FERRY_LINKS.forEach(([a, b]) => add('ferry', a, b));
  return edges;
})();

/** A gentle bend per road so streets look hand-drawn instead of ruled. Deterministic per pair of stations. */
export function roadPath(a: StationData, b: StationData): string {
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const bend = (((a.id * 73 + b.id * 131) % 100) - 50) / 50;
  const nx = -(b.y - a.y) / length;
  const ny = (b.x - a.x) / length;
  const cx = (a.x + b.x) / 2 + nx * bend * length * 0.12;
  const cy = (a.y + b.y) / 2 + ny * bend * length * 0.12;
  return `M${a.x} ${a.y} Q${cx.toFixed(0)} ${cy.toFixed(0)} ${b.x} ${b.y}`;
}

/** Where the river runs (found by tracing the widest gap through the real station layout). */
const RIVER: [number, number][] = [
  [-60, 1080], [120, 1080], [240, 1080], [360, 1080], [480, 1080], [600, 1080], [720, 1084], [840, 1111], [960, 1238], [1080, 1313],
  [1200, 1251], [1320, 1318], [1440, 1258], [1560, 1056], [1680, 929], [1800, 900], [1920, 904], [2040, 931], [2160, 1058],
  [2280, 1124], [2400, 1040], [2520, 1000], [2660, 1000],
];

/** Parks: centre x, centre y, radius x, radius y (open areas of the layout). */
const PARKS: [number, number, number, number][] = [
  [669, 148, 250, 150],
  [1038, 1850, 330, 95],
  [2439, 1800, 150, 125],
  [1906, 1822, 115, 95],
  [1711, 1493, 112, 80],
  [1470, 52, 100, 65],
  [96, 80, 100, 80],
];

/** Landmarks: public geography, labelled where they sit relative to the stations. */
const LABELS: [string, number, number, number][] = [
  ["REGENT'S PARK", 786, 190, 34],
  ['MADAME TUSSAUDS', 800, 410, 24],
  ['BT TOWER', 1061, 440, 24],
  ['BRITISH MUSEUM', 1447, 592, 28],
  ['PICCADILLY CIRCUS', 909, 812, 24],
  ['COVENT GARDEN', 1342, 806, 26],
  ['ROYAL COURTS OF JUSTICE', 1646, 704, 22],
  ['THE TEMPLE', 1783, 798, 26],
  ['SMITHFIELD MARKET', 1918, 622, 22],
  ["ST. PAUL'S CATHEDRAL", 1906, 700, 22],
  ['BANK OF ENGLAND', 2276, 664, 22],
  ['LIVERPOOL ST.', 2366, 516, 26],
  ['THE GHERKIN', 2461, 590, 22],
  ['RIVER THAMES', 1850, 985, 42],
];

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function riverPath(): Path2D {
  const p = new Path2D();
  p.moveTo(RIVER[0][0], RIVER[0][1]);
  for (let i = 1; i < RIVER.length - 1; i++) {
    const mx = (RIVER[i][0] + RIVER[i + 1][0]) / 2;
    const my = (RIVER[i][1] + RIVER[i + 1][1]) / 2;
    p.quadraticCurveTo(RIVER[i][0], RIVER[i][1], mx, my);
  }
  p.lineTo(RIVER[RIVER.length - 1][0], RIVER[RIVER.length - 1][1]);
  return p;
}

/** Distance from a point to the river's centre line (sampled). */
function riverSamples(): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < RIVER.length - 1; i++) {
    for (let t = 0; t < 1; t += 0.1) out.push([RIVER[i][0] + (RIVER[i + 1][0] - RIVER[i][0]) * t, RIVER[i][1] + (RIVER[i + 1][1] - RIVER[i][1]) * t]);
  }
  return out;
}

const ROOFS = ['#e2733a', '#d9622d', '#ee8a45', '#c9532a', '#e9a050', '#b9604a', '#7f8fa0'];
const WALLS = ['#ecc98f', '#dcae76', '#f0d9a8', '#d9b585'];

/** Paints the ground bitmap (≈0.5 s) and returns it as an image URL. */
export function paintMapGround(): string {
  const k = 0.78;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(MAP_WIDTH * k);
  canvas.height = Math.ceil(MAP_HEIGHT * k);
  const g = canvas.getContext('2d')!;
  g.scale(k, k);
  const r = mulberry32(77);

  const base = g.createLinearGradient(0, 0, MAP_WIDTH, MAP_HEIGHT);
  base.addColorStop(0, '#ead9ad');
  base.addColorStop(1, '#dcc693');
  g.fillStyle = base;
  g.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // River with banks and glints.
  g.lineCap = 'round';
  const river = riverPath();
  g.lineWidth = 230;
  g.strokeStyle = '#e4d1a0';
  g.stroke(river);
  g.lineWidth = 170;
  g.strokeStyle = '#6fb0d8';
  g.stroke(river);
  g.lineWidth = 120;
  g.strokeStyle = '#8cc4e4';
  g.stroke(river);
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(255,255,255,.6)';
  g.setLineDash([30, 40]);
  for (const offset of [-34, 0, 34]) {
    g.save();
    g.translate(0, offset);
    g.stroke(river);
    g.restore();
  }
  g.setLineDash([]);

  // Parks.
  PARKS.forEach(([cx, cy, rx, ry], index) => {
    const outline = Array.from({ length: 48 }, (_, i) => {
      const a = (i / 48) * Math.PI * 2;
      const wobble = 1 + 0.1 * Math.sin(a * 3 + index) + 0.06 * Math.sin(a * 5 + index * 2);
      return [cx + Math.cos(a) * rx * wobble, cy + Math.sin(a) * ry * wobble] as [number, number];
    });
    g.beginPath();
    outline.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = '#9ccc78';
    g.fill();
    g.lineWidth = 10;
    g.strokeStyle = '#cde5b0';
    g.stroke();
    g.beginPath();
    g.moveTo(cx - rx * 0.9, cy + ry * 0.2);
    g.bezierCurveTo(cx - rx * 0.3, cy - ry * 0.7, cx + rx * 0.3, cy + ry * 0.6, cx + rx * 0.9, cy - ry * 0.1);
    g.lineWidth = 9;
    g.strokeStyle = '#f2dd78';
    g.stroke();
    for (let i = 0; i < Math.floor((rx * ry) / 700); i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      const x = cx + Math.cos(a) * rx * 0.92 * d;
      const y = cy + Math.sin(a) * ry * 0.92 * d;
      const tree = 8 + r() * 7;
      g.fillStyle = 'rgba(30,60,20,.28)';
      g.beginPath();
      g.ellipse(x + 5, y + tree * 0.7, tree, tree * 0.5, 0, 0, 7);
      g.fill();
      const gr = g.createRadialGradient(x - tree * 0.3, y - tree * 0.4, 1, x, y, tree);
      gr.addColorStop(0, '#7fbf5a');
      gr.addColorStop(1, '#3f7f34');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, tree, 0, 7);
      g.fill();
    }
  });

  // Buildings: back to front, never on a road, a station, the river or a park.
  const riverPoints = riverSamples();
  const inPark = (x: number, y: number) => PARKS.some(([cx, cy, rx, ry]) => ((x - cx) / (rx + 34)) ** 2 + ((y - cy) / (ry + 34)) ** 2 < 1);
  const inRiver = (x: number, y: number) => riverPoints.some(([rx, ry]) => Math.hypot(x - rx, y - ry) < 118);
  const roadDistance = (x: number, y: number) => {
    let d = Infinity;
    for (const { a, b } of MAP_EDGES) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)));
      d = Math.min(d, Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)));
    }
    for (const s of STATIONS) d = Math.min(d, Math.hypot(x - s.x, y - s.y) - 14);
    return d;
  };
  const buildings: [number, number, number][] = [];
  for (let y = 30; y < MAP_HEIGHT - 10; y += 21) {
    for (let x = 30; x < MAP_WIDTH - 10; x += 25) {
      const px = x + (r() - 0.5) * 10;
      const py = y + (r() - 0.5) * 9;
      if (inRiver(px, py) || inPark(px, py) || roadDistance(px, py) < 30) continue;
      buildings.push([px, py, r()]);
    }
  }
  buildings.sort((a, b) => a[1] - b[1]);
  buildings.forEach(([x, y, q]) => {
    const w = 22 + q * 15;
    const h = 14 + ((q * 37) % 1) * 15;
    const depth = 10;
    const roof = ROOFS[Math.floor(q * 997) % ROOFS.length];
    const wall = WALLS[Math.floor(q * 313) % WALLS.length];
    g.fillStyle = 'rgba(70,35,10,.22)';
    g.beginPath();
    g.ellipse(x + 6, y + 3, w * 0.62, 5, 0, 0, 7);
    g.fill();
    g.fillStyle = wall;
    g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = 'rgba(90,50,20,.22)';
    g.fillRect(x + w / 2 - 5, y - h, 5, h);
    g.fillStyle = 'rgba(70,40,20,.55)';
    for (let wx = x - w / 2 + 4; wx < x + w / 2 - 5; wx += 6) g.fillRect(wx, y - h + 4, 2.4, 3.4);
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(x - w / 2 - 1.5, y - h);
    g.lineTo(x + w / 2 + 1.5, y - h);
    g.lineTo(x + w / 2 - 3, y - h - depth);
    g.lineTo(x - w / 2 + 3, y - h - depth);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,230,190,.35)';
    g.fillRect(x - w / 2 + 3, y - h - depth, w - 6, 2);
    g.fillStyle = 'rgba(60,20,5,.3)';
    g.fillRect(x + w / 2 - 5, y - h - depth + 1, 3, depth - 1);
    g.lineWidth = 1.1;
    g.strokeStyle = 'rgba(80,40,15,.55)';
    g.strokeRect(x - w / 2, y - h, w, h);
  });

  // Landmark names on small paper tags.
  g.textAlign = 'center';
  LABELS.forEach(([text, x, y, size]) => {
    g.font = `700 ${size}px Karla, sans-serif`;
    const width = g.measureText(text).width;
    g.fillStyle = 'rgba(255,252,240,.82)';
    g.beginPath();
    g.roundRect(x - width / 2 - 12, y - size * 0.8, width + 24, size * 1.15, 8);
    g.fill();
    g.fillStyle = '#4a3520';
    g.fillText(text, x, y);
  });

  return canvas.toDataURL('image/webp', 0.88);
}

let cachedGround: string | null = null;

export function peekMapGround(): string | null {
  return cachedGround;
}

export function ensureMapGround(): string {
  if (!cachedGround) cachedGround = paintMapGround();
  return cachedGround;
}
