// Scotland Yard — illustrated London map, "v2" style (study of the reference sheet).
// Isomorphic: renderMap(createCanvas, data, opts) works in Node (@napi-rs/canvas) and in a browser.

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const PALETTE = {
  street: '#fdf7ea',
  line: '#3a241a',
  roofs: ['#f6d5b6', '#f8dcc0', '#f3cbb0', '#f7dbb4', '#f1c9b0', '#fae3cc'],
  wallFront: '#efc4a8',
  wallSide: '#dcaa8e',
  maroon: { roof: '#b4584a', wall: '#8e3f35' },
  slate: { roof: '#d3d9e4', wall: '#a2aec2' },
  water: '#9db9df',
  waterDeep: '#86a6d3',
  waterLine: '#2d4068',
  park: '#a6d64a',
  parkDeep: '#92c93d',
  parkPath: '#eef5c6',
  tree: ['#6dbb3c', '#58a932', '#7ec846'],
  treeLine: '#2a5e1c',
  taxi: '#f5b81c',
  taxiEdge: '#d38d0c',
  bus: '#4fbfa5',
  ug: '#e2457e',
  ugBand: '#f39a2b',
  pillFill: '#f9e293',
};

export function renderMap(createCanvas, data, opts = {}) {
  const { Path2D: P2D = globalThis.Path2D, seed = 11, scale = 1, crop = null, drawStations = true, drawRoads = true, drawLabels = true, tagScale = 0.85, log = () => {} } = opts;
  const W = data.width, H = data.height;
  const rnd = mulberry32(seed);
  const rr = (a, b) => a + (b - a) * rnd();
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const byId = new Map(data.stations.map((s) => [s.id, s]));
  const t0 = Date.now();
  const stamp = (m) => log(`${m} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);

  // ---------------------------------------------------------------- roads as sampled polylines
  const roads = data.roads.map((r) => {
    const a = byId.get(r.a), b = byId.get(r.b);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L;
    const h1 = ((r.a * 73 + r.b * 131) % 100) / 100, h2 = ((r.a * 37 + r.b * 211) % 100) / 100;
    const k1 = (h1 - 0.5) * 0.26, k2 = (h2 - 0.5) * 0.26;
    const p1 = { x: a.x + dx * 0.33 + nx * L * k1, y: a.y + dy * 0.33 + ny * L * k1 };
    const p2 = { x: a.x + dx * 0.66 + nx * L * k2, y: a.y + dy * 0.66 + ny * L * k2 };
    const n = Math.max(6, Math.ceil(L / 5));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      pts.push({ x: u ** 3 * a.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t ** 3 * b.x, y: u ** 3 * a.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t ** 3 * b.y });
    }
    let s = 0;
    pts.forEach((p, i) => {
      if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      p.s = s;
    });
    pts.forEach((p, i) => {
      const q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
      const tl = Math.hypot(q.x - o.x, q.y - o.y) || 1;
      p.tx = (q.x - o.x) / tl; p.ty = (q.y - o.y) / tl; p.nx = -p.ty; p.ny = p.tx;
    });
    const kinds = (r.taxi ? 1 : 0) + (r.bus ? 1 : 0) + (r.ug ? 1 : 0);
    return { ...r, a, b, pts, L: s, half: r.ferry && !kinds ? 9 : 8 + 2.7 * Math.max(1, kinds) };
  });

  // ---------------------------------------------------------------- water + parks geometry
  const rv = data.river;
  const riverCenter = [[rv.center[0][0] - 120, rv.center[0][1] + 110], ...rv.center, [rv.center[rv.center.length - 1][0] + 120, rv.center[rv.center.length - 1][1] + 10]];
  const smooth = (pts) => {
    const p = new P2D();
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) p.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    p.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    return p;
  };
  const poly = (pts) => {
    const p = new P2D();
    pts.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
    p.closePath();
    return p;
  };
  const riverPath = smooth(riverCenter);
  const parkPaths = data.parks.map(poly);
  const piecePaths = rv.pieces.map(poly);

  // ---------------------------------------------------------------- occupancy grid (4 map units per cell)
  const CELL = 4, gw = Math.ceil(W / CELL), gh = Math.ceil(H / CELL);
  const grid = new Uint8Array(gw * gh);
  const maskCanvas = (draw) => {
    const mc = createCanvas(gw, gh), mg = mc.getContext('2d');
    mg.scale(1 / CELL, 1 / CELL);
    mg.fillStyle = '#000'; mg.strokeStyle = '#000'; mg.lineCap = 'round'; mg.lineJoin = 'round';
    draw(mg);
    return mg.getImageData(0, 0, gw, gh).data;
  };
  const waterData = maskCanvas((mg) => {
    mg.lineWidth = rv.width; mg.stroke(riverPath);
    piecePaths.forEach((p) => mg.fill(p));
  });
  const water = new Uint8Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) water[i] = waterData[i * 4 + 3] > 80 ? 1 : 0;
  const staticData = maskCanvas((mg) => {
    mg.lineWidth = rv.width + 26; mg.stroke(riverPath);
    piecePaths.forEach((p) => { mg.fill(p); mg.lineWidth = 22; mg.stroke(p); });
    parkPaths.forEach((p) => { mg.fill(p); mg.lineWidth = 14; mg.stroke(p); });
    roads.forEach((r) => {
      mg.lineWidth = r.half * 2 + 8;
      mg.beginPath(); r.pts.forEach((p, i) => (i ? mg.lineTo(p.x, p.y) : mg.moveTo(p.x, p.y))); mg.stroke();
    });
    data.stations.forEach((s) => { mg.beginPath(); mg.ellipse(s.x, s.y, 31 * tagScale + 9, 31 * tagScale + 7, 0, 0, 7); mg.fill(); });
  });
  for (let i = 0; i < gw * gh; i++) grid[i] = staticData[i * 4 + 3] > 20 ? 1 : 0;
  const isWater = (x, y) => { const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL); return cx >= 0 && cy >= 0 && cx < gw && cy < gh && water[cy * gw + cx] === 1; };
  const staticBlocked = grid.slice();
  stamp('masks');

  // footprint tests on the grid; (cx,cy) centre, w along the axis at angle `ang`, d across it
  function cellsOf(cx, cy, w, d, ang, inset, fn) {
    const c = Math.cos(ang), s = Math.sin(ang);
    const hw = w / 2 - inset, hd = d / 2 - inset;
    const ext = Math.abs(c) * hw + Math.abs(s) * hd, eyt = Math.abs(s) * hw + Math.abs(c) * hd;
    const x0 = Math.max(0, Math.floor((cx - ext) / CELL)), x1 = Math.min(gw - 1, Math.floor((cx + ext) / CELL));
    const y0 = Math.max(0, Math.floor((cy - eyt) / CELL)), y1 = Math.min(gh - 1, Math.floor((cy + eyt) / CELL));
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const x = (gx + 0.5) * CELL - cx, y = (gy + 0.5) * CELL - cy;
      const u = x * c + y * s, v = -x * s + y * c;
      if (Math.abs(u) <= hw && Math.abs(v) <= hd && fn(gy * gw + gx)) return true;
    }
    return false;
  }
  const footprintFree = (cx, cy, w, d, ang) => cx - w / 2 > -20 && cx + w / 2 < W + 20 && cy - d / 2 > -20 && cy + d / 2 < H + 20 && !cellsOf(cx, cy, w, d, ang, 1.2, (i) => grid[i] !== 0);
  const claim = (cx, cy, w, d, ang) => cellsOf(cx, cy, w, d, ang, 1.2, (i) => { grid[i] = 2; return false; });

  const items = []; // {y, draw}
  const buildings = [];

  // ---------------------------------------------------------------- landmarks claim their ground first
  // a landmark that would sit on a street slides to the nearest free ground
  const blockedIn = (cx, cy, w, d) => { let n = 0; cellsOf(cx, cy, w, d, 0, 1, (i) => { if (grid[i] !== 0) n++; return false; }); return n; };
  const landmarks = (data.landmarks || []).map((lm) => {
    if (lm.fixed) return lm;
    let best = { x: lm.x, y: lm.y, cost: blockedIn(lm.x, lm.y, lm.w, lm.d) };
    for (let r = 12; r <= 150 && best.cost > 0; r += 12) {
      for (let a = 0; a < 16; a++) {
        const x = lm.x + Math.cos((a / 16) * Math.PI * 2) * r, y = lm.y + Math.sin((a / 16) * Math.PI * 2) * r;
        const cost = blockedIn(x, y, lm.w, lm.d);
        if (cost < best.cost) best = { x, y, cost };
      }
    }
    return { ...lm, x: best.x, y: best.y };
  });
  landmarks.forEach((lm) => { claim(lm.x, lm.y, lm.w + 8, lm.d + 8, 0); });
  const labelList = [...(data.labels || []), ...landmarks.filter((lm) => lm.label).map((lm) => [lm.label, lm.x, lm.y + lm.d / 2 + 16, 10])];

  // ---------------------------------------------------------------- street-lined rows of buildings
  const pointAt = (pts, s) => {
    let lo = 0, hi = pts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid].s <= s) lo = mid; else hi = mid; }
    const a = pts[lo], b = pts[hi], t = b.s === a.s ? 0 : (s - a.s) / (b.s - a.s);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx: a.tx, ty: a.ty, nx: a.nx, ny: a.ny };
  };
  const sidesState = [];
  const order = roads.map((_, i) => i).sort(() => rnd() - 0.5);
  order.forEach((i) => { [-1, 1].forEach((side) => sidesState.push({ road: roads[i], side, inner: new Float32Array(Math.ceil(roads[i].L / 12) + 2).fill(roads[i].half + 6.5) })); });

  const addBuilding = (b) => { buildings.push(b); claim(b.x, b.y, b.w, b.d, b.ang); };
  let tries = 0, ok = 0;
  for (let row = 0; row < 9; row++) {
    for (const st of sidesState) {
      const { road, side, inner } = st;
      let s = rr(0, 12), groupEnd = 0, gd = 30, gHeight = 20, tall = false;
      while (s < road.L - 6) {
        if (s >= groupEnd) {
          groupEnd = s + rr(60, 200); gd = rr(13, 25); gHeight = rr(7, 14); tall = rnd() < 0.08;
          if (rnd() < 0.2) s += rr(8, 18);
        }
        const w = rr(15, 36);
        const sc = Math.min(road.L, s + w / 2);
        const p = pointAt(road.pts, sc);
        const b0 = Math.floor(Math.max(0, s) / 12), b1 = Math.floor(Math.min(road.L, s + w) / 12);
        let dIn = 0; for (let k = b0; k <= b1; k++) dIn = Math.max(dIn, inner[k]);
        const D = dIn + gd / 2;
        const cx = p.x + side * p.nx * D, cy = p.y + side * p.ny * D;
        const ang = Math.atan2(p.ty, p.tx) + rr(-0.035, 0.035);
        tries++;
        if (footprintFree(cx, cy, w, gd, ang)) {
          ok++;
          const h = gHeight + rr(-2, 3) + (tall ? rr(5, 14) : 0);
          addBuilding({ x: cx, y: cy, w, d: gd, ang, h });
          for (let k = b0; k <= b1; k++) inner[k] = dIn + gd + (rnd() < 0.15 ? rr(2, 6) : 0);
          s += w + (rnd() < 0.05 ? rr(6, 12) : 0);
        } else s += 8;
      }
    }
    stamp(`row ${row} → ${buildings.length} buildings (tries ${tries}, ok ${ok})`);
  }

  // orientation field for filling what the rows left over
  const FC = 16, fw = Math.ceil(W / FC), fh = Math.ceil(H / FC);
  const fAng = new Float32Array(fw * fh), fDist = new Float32Array(fw * fh).fill(1e9);
  roads.forEach((r) => {
    for (let i = 0; i < r.pts.length; i += 2) {
      const p = r.pts[i], ang = Math.atan2(p.ty, p.tx);
      const gx = Math.floor(p.x / FC), gy = Math.floor(p.y / FC), R = 12;
      for (let yy = Math.max(0, gy - R); yy <= Math.min(fh - 1, gy + R); yy++) for (let xx = Math.max(0, gx - R); xx <= Math.min(fw - 1, gx + R); xx++) {
        const d = Math.hypot((xx + 0.5) * FC - p.x, (yy + 0.5) * FC - p.y);
        if (d < fDist[yy * fw + xx]) { fDist[yy * fw + xx] = d; fAng[yy * fw + xx] = ang; }
      }
    }
  });
  for (const [wMin, wMax, step, skip, maxDist] of [[26, 38, 8, 0.03, 420], [20, 30, 6, 0.04, 320], [15, 22, 5, 0.06, 240], [11, 16, 4, 0.12, 150], [8, 11, 3, 0.22, 90]]) {
    for (let y = 8; y < H; y += step) for (let x = 8; x < W; x += step) {
      if (rnd() < skip) continue;
      const cx = x + rr(-4, 4), cy = y + rr(-4, 4);
      const gi = Math.floor(cy / FC) * fw + Math.floor(cx / FC);
      if (fDist[gi] > maxDist) continue;
      const w = rr(wMin, wMax), d = Math.max(7, rr(wMin, wMax) * rr(0.5, 0.85)), ang = fAng[gi] + (rnd() < 0.5 ? 0 : Math.PI / 2) + rr(-0.02, 0.02);
      if (footprintFree(cx, cy, w, d, ang)) addBuilding({ x: cx, y: cy, w, d, ang, h: (wMax < 20 ? rr(5, 10) : rr(7, 14)) + (rnd() < 0.05 && wMax > 20 ? rr(5, 14) : 0) });
    }
    stamp(`fill → ${buildings.length} buildings`);
  }

  // ---------------------------------------------------------------- how a building is drawn
  const EX = 0.2;
  const mix = (c1, c2, t) => {
    const a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16);
    const ch = (s) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };
  function drawBuilding(g, b) {
    const hw = b.w / 2, hd = b.d / 2, c = Math.cos(b.ang), s = Math.sin(b.ang);
    const base = [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => ({ x: b.x + u * c - v * s, y: b.y + u * s + v * c }));
    const ex = EX * b.h, ey = -b.h;
    const roof = base.map((p) => ({ x: p.x + ex, y: p.y + ey }));
    let roofCol = b.roof, wallF = b.wallF, wallS = b.wallS;
    g.lineJoin = 'round';
    for (let i = 0; i < 4; i++) {
      const p = base[i], q = base[(i + 1) % 4];
      const dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy);
      const nx = dy / len, ny = -dx / len;
      if (nx * ex + ny * ey >= -0.01 * b.h) continue;
      const lit = Math.max(0, Math.min(1, 0.5 + 0.6 * (nx * -0.55 + ny * 0.45)));
      g.fillStyle = mix(wallS, wallF, lit);
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.lineTo(q.x + ex, q.y + ey); g.lineTo(p.x + ex, p.y + ey); g.closePath(); g.fill();
      // windows: fine vertical strokes, a floor line every ~9 units
      g.strokeStyle = 'rgba(96,52,32,0.42)'; g.lineWidth = 0.9;
      const n = Math.floor(len / 6);
      g.beginPath();
      for (let k = 1; k < n; k++) { const t = k / n; g.moveTo(p.x + dx * t + ex * 0.1, p.y + dy * t + ey * 0.1); g.lineTo(p.x + dx * t + ex * 0.88, p.y + dy * t + ey * 0.88); }
      g.stroke();
      if (b.h > 22) { g.strokeStyle = 'rgba(96,52,32,0.3)'; g.beginPath(); for (let f = 1; f < b.h / 10; f++) { const t = (f * 10) / b.h; g.moveTo(p.x + ex * t, p.y + ey * t); g.lineTo(q.x + ex * t, q.y + ey * t); } g.stroke(); }
      g.strokeStyle = PALETTE.line; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.lineTo(q.x + ex, q.y + ey); g.lineTo(p.x + ex, p.y + ey); g.closePath(); g.stroke();
    }
    g.fillStyle = roofCol;
    g.beginPath(); roof.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fill();
    g.strokeStyle = PALETTE.line; g.lineWidth = 1.7; g.stroke();
    // roof detail
    const rc = { x: (roof[0].x + roof[2].x) / 2, y: (roof[0].y + roof[2].y) / 2 };
    g.lineWidth = 1;
    if (b.detail === 0) {
      g.strokeStyle = 'rgba(120,64,40,0.6)';
      g.beginPath();
      roof.forEach((p, i) => { const x = p.x + (rc.x - p.x) * 0.2, y = p.y + (rc.y - p.y) * 0.2; i ? g.lineTo(x, y) : g.moveTo(x, y); });
      g.closePath(); g.stroke();
    } else if (b.detail === 1) {
      g.strokeStyle = 'rgba(120,64,40,0.7)'; g.lineWidth = 1.2;
      const along = b.w >= b.d;
      const [a1, a2] = along ? [mid(roof[0], roof[3]), mid(roof[1], roof[2])] : [mid(roof[0], roof[1]), mid(roof[3], roof[2])];
      g.beginPath(); g.moveTo(a1.x, a1.y); g.lineTo(a2.x, a2.y); g.stroke();
      g.fillStyle = 'rgba(255,240,220,0.32)';
      const [r0, r1] = along ? [roof[0], roof[1]] : [roof[0], roof[3]];
      g.beginPath(); g.moveTo(r0.x, r0.y); g.lineTo(r1.x, r1.y); g.lineTo(a2.x, a2.y); g.lineTo(a1.x, a1.y); g.closePath(); g.fill();
    }
  }
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  buildings.forEach((b) => {
    const r = rnd();
    if (r < 0.02) { b.roof = PALETTE.maroon.roof; b.wallF = PALETTE.maroon.wall; b.wallS = '#6f2e27'; }
    else if (r < 0.04) { b.roof = PALETTE.slate.roof; b.wallF = PALETTE.slate.wall; b.wallS = '#7d8ba3'; }
    else if (r < 0.1) { b.roof = '#f1b9a8'; b.wallF = '#dc9b86'; b.wallS = '#c47f6c'; }
    else { b.roof = pick(PALETTE.roofs); b.wallF = PALETTE.wallFront; b.wallS = PALETTE.wallSide; }
    b.detail = Math.floor(rnd() * 4);
    let maxY = -1e9;
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) maxY = Math.max(maxY, b.y + u * (b.w / 2) * Math.sin(b.ang) + v * (b.d / 2) * Math.cos(b.ang));
    items.push({ y: maxY, draw: (g) => drawBuilding(g, b) });
  });

  // ---------------------------------------------------------------- trees
  function drawTree(g, x, y, r) {
    g.fillStyle = 'rgba(35,70,25,0.28)';
    g.beginPath(); g.ellipse(x + r * 0.5, y + r * 0.9, r * 0.95, r * 0.45, 0, 0, 7); g.fill();
    const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r * 1.05);
    gr.addColorStop(0, '#9bd95c'); gr.addColorStop(0.55, '#5fb336'); gr.addColorStop(1, '#3d8a2b');
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    g.strokeStyle = PALETTE.treeLine; g.lineWidth = 1.2; g.stroke();
  }
  const addTree = (x, y, r) => { items.push({ y: y + r * 0.8, draw: (g) => drawTree(g, x, y, r) }); claim(x, y, r * 2, r * 2, 0); };
  const insideParks = (x, y) => {
    const q = createCanvas(1, 1).getContext('2d');
    return parkPaths.some((p) => q.isPointInPath(p, x, y));
  };

  // parks: a ring of trees along the edge + scattered clusters inside
  const parkTree = createCanvas(1, 1).getContext('2d');
  data.parks.forEach((pts, pi) => {
    // edge belt
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.floor(len / 13);
      for (let k = 0; k < steps; k++) {
        const t = (k + rnd() * 0.5) / steps;
        const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        if (rnd() < 0.82 && !isWater(x, y)) items.push({ y: y + 6, draw: (g) => drawTree(g, x, y, rr(6, 8.5)) });
      }
    }
    // interior
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, area = 0;
    pts.forEach(([x, y], i) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); const q = pts[(i + 1) % pts.length]; area += pts[i][0] * q[1] - q[0] * pts[i][1]; });
    area = Math.abs(area) / 2;
    const n = Math.floor(area / 1300);
    for (let i = 0; i < n * 3 && n > 0; i++) {
      const x = rr(minx, maxx), y = rr(miny, maxy);
      if (!parkTree.isPointInPath(parkPaths[pi], x, y) || isWater(x, y)) continue;
      const cluster = rnd() < 0.55 ? Math.floor(rr(2, 5)) : 1;
      for (let k = 0; k < cluster; k++) {
        const tx = x + rr(-12, 12), ty = y + rr(-9, 9);
        if (parkTree.isPointInPath(parkPaths[pi], tx, ty) && !isWater(tx, ty)) items.push({ y: ty + 7, draw: (g) => drawTree(g, tx, ty, rr(6, 10)) });
      }
      if (--area < 0) break;
    }
  });
  stamp('parks trees');

  // courtyards: free cells hemmed in by buildings
  const occ = (gx, gy) => (gx < 0 || gy < 0 || gx >= gw || gy >= gh ? 1 : grid[gy * gw + gx]);
  for (let gy = 4; gy < gh - 4; gy += 3) for (let gx = 4; gx < gw - 4; gx += 3) {
    if (occ(gx, gy) || staticBlocked[gy * gw + gx]) continue;
    let near = 0, total = 0;
    for (let dy = -6; dy <= 6; dy += 2) for (let dx = -6; dx <= 6; dx += 2) { total++; if (grid[(gy + dy) * gw + gx + dx] === 2) near++; }
    if (near / total < 0.34 || rnd() > 0.5) continue;
    const x = (gx + 0.5) * CELL, y = (gy + 0.5) * CELL;
    const n = rnd() < 0.5 ? 1 : 3;
    for (let k = 0; k < n; k++) { const tx = x + rr(-7, 7) * (n > 1), ty = y + rr(-6, 6) * (n > 1), r = rr(5.5, 8); if (!isWater(tx, ty)) addTree(tx, ty, r); }
  }
  // tree-lined streets
  roads.forEach((r) => {
    if (rnd() > 0.28) return;
    const side = rnd() < 0.5 ? -1 : 1;
    for (let s = 20; s < r.L - 20; s += rr(13, 17)) {
      const p = pointAt(r.pts, s);
      const x = p.x + side * p.nx * (r.half + 7), y = p.y + side * p.ny * (r.half + 7);
      const gx = Math.floor(x / CELL), gy = Math.floor(y / CELL);
      if (occ(gx, gy) === 1 || isWater(x, y)) continue;
      if (rnd() < 0.85) items.push({ y: y + 5, draw: (g) => drawTree(g, x, y, rr(5, 6.8)) });
    }
  });
  stamp('trees');

  // ---------------------------------------------------------------- landmarks: taller, coloured, hand-placed
  const mk = (x, y, w, d, h, roof, wallF, wallS, detail = 3) => ({ x, y, w, d, h, roof, wallF, wallS, detail, ang: 0 });
  const lmBox = (b, key) => items.push({ y: key ?? b.y + b.d / 2, draw: (g) => drawBuilding(g, b) });
  const spire = (cx, cy, w, hgt, col) => ({ y: cy + 1, draw: (g) => {
    g.fillStyle = col; g.strokeStyle = PALETTE.line; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(cx - w / 2, cy); g.lineTo(cx + w / 2, cy); g.lineTo(cx, cy - hgt); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.moveTo(cx, cy - hgt); g.lineTo(cx + w / 2, cy); g.lineTo(cx, cy); g.closePath(); g.fill();
  } });
  const cylinder = (x, y, rx, ry, h, side, top, extra) => ({ y: y + ry, draw: (g) => {
    g.lineWidth = 1.7; g.strokeStyle = PALETTE.line;
    g.fillStyle = side; g.beginPath(); g.moveTo(x - rx, y); g.lineTo(x - rx, y - h); g.lineTo(x + rx, y - h); g.lineTo(x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = top; g.beginPath(); g.ellipse(x, y - h, rx, ry, 0, 0, 7); g.fill(); g.stroke();
    if (extra) extra(g);
  } });
  const dome = (x, y, rx, ry, h, col) => ({ y: y + ry + 2, draw: (g) => {
    g.lineWidth = 1.7; g.strokeStyle = PALETTE.line; g.fillStyle = col;
    g.beginPath(); g.moveTo(x - rx, y); g.bezierCurveTo(x - rx, y - h * 1.25, x + rx, y - h * 1.25, x + rx, y); g.ellipse(x, y, rx, ry, 0, 0, Math.PI); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(x - rx * 0.3, y - h * 0.62, rx * 0.22, h * 0.3, -0.5, 0, 7); g.fill();
  } });
  landmarks.forEach((lm) => {
    const { x, y } = lm;
    const H = (b) => EX * b.h;
    switch (lm.type) {
      case 'palace': {
        lmBox(mk(x - 44, y + 6, 24, 26, 15, '#c7cdd8', '#eadfc3', '#cfc19b', 1));
        lmBox(mk(x + 44, y + 6, 24, 26, 15, '#c7cdd8', '#eadfc3', '#cfc19b', 1));
        const m = mk(x, y, 66, 34, 24, '#c2c9d6', '#f1e6cb', '#d6c8a2', 1); lmBox(m);
        items.push({ y: y + 40, draw: (g) => { const px = x + H(m), py = y - m.h - 6; g.strokeStyle = '#3a241a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(px, py); g.lineTo(px, py - 24); g.stroke(); g.fillStyle = '#d23a3a'; g.fillRect(px, py - 24, 13, 8); g.strokeRect(px, py - 24, 13, 8); } });
        break;
      }
      case 'parliament': {
        const m = mk(x - 4, y + 4, 98, 24, 17, '#7f8eac', '#e9d3a2', '#cdb585', 1); lmBox(m);
        lmBox(mk(x - 36, y + 8, 18, 22, 28, '#7f8eac', '#e9d3a2', '#cdb585', 3));
        const t = mk(x + 52, y + 2, 15, 15, 58, '#6f809e', '#e9d3a2', '#cdb585', 3); lmBox(t);
        items.push(spire(x + 52 + H(t), y + 2 - t.h + 3, 18, 22, '#6f809e'));
        items.push({ y: y + 14, draw: (g) => { const cx = x + 52 + H(t) * 0.5, cy = y + 2 + 7 - t.h * 0.78; g.fillStyle = '#fffdf2'; g.strokeStyle = PALETTE.line; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 4.8, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 3); g.moveTo(cx, cy); g.lineTo(cx + 2.4, cy); g.stroke(); } });
        break;
      }
      case 'abbey': {
        lmBox(mk(x, y, 44, 26, 20, '#aab3c4', '#ebdfc4', '#cfc09a', 1));
        [-13, 13].forEach((dx) => { const t = mk(x + dx, y + 15, 11, 11, 38, '#97a0b3', '#ebdfc4', '#cfc09a', 3); lmBox(t); items.push(spire(x + dx + H(t), y + 15 - t.h + 2, 12, 11, '#97a0b3')); });
        break;
      }
      case 'stpauls': {
        lmBox(mk(x, y + 8, 62, 30, 15, '#cfd5de', '#efe5d2', '#d3c6a8', 1), y - 30);
        items.push(cylinder(x + 3, y + 8, 14, 6, 20, '#ece1cc', '#d4dbe6'));
        items.push(dome(x + 3, y - 12, 13, 5.5, 18, '#b9c7dd'));
        items.push(spire(x + 3, y - 34, 4, 9, '#e7dfcc'));
        break;
      }
      case 'tower_london': {
        lmBox(mk(x, y + 6, 86, 56, 7, '#ddd8cc', '#bdb7a8', '#a39d8f', 0), y - 60);
        [[-38, -18], [38, -18], [-38, 28], [38, 28]].forEach(([dx, dy]) => { const t = mk(x + dx, y + dy, 11, 11, 20, '#d6d0c2', '#c6c0b1', '#a9a395', 3); lmBox(t); items.push(spire(x + dx + H(t), y + dy - t.h + 2, 12, 8, '#8d98ae')); });
        lmBox(mk(x, y + 8, 26, 24, 36, '#f4f0e6', '#dcd6c6', '#bfb9a8', 0));
        break;
      }
      case 'bt_tower': {
        items.push(cylinder(x, y, 6, 3, 78, '#dfe3ea', '#c3cad6', (g) => { g.fillStyle = '#cdd4df'; g.strokeStyle = PALETTE.line; g.lineWidth = 1.6; g.fillStyle = '#e8ecf2'; g.fillRect(x - 10.5, y - 66, 21, 8); g.strokeRect(x - 10.5, y - 66, 21, 8); g.beginPath(); g.ellipse(x, y - 66, 10.5, 4, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.moveTo(x, y - 70); g.lineTo(x, y - 88); g.stroke(); }));
        break;
      }
      case 'lords': {
        items.push({ y: y + 30, draw: (g) => {
          g.lineWidth = 2; g.strokeStyle = PALETTE.line;
          g.fillStyle = '#c9855d'; g.beginPath(); g.ellipse(x, y + 3, 52, 33, 0, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#ead7b6'; g.beginPath(); g.ellipse(x, y - 1, 52, 31, 0, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#8fcf45'; g.beginPath(); g.ellipse(x, y - 1, 38, 21, 0, 0, 7); g.fill(); g.stroke();
          g.fillStyle = '#e9efb0'; g.fillRect(x - 3, y - 13, 6, 24); g.strokeRect(x - 3, y - 13, 6, 24);
        } });
        break;
      }
      case 'museum': {
        lmBox(mk(x, y, 100, 28, 20, '#cf9873', '#e4b992', '#c99a74', 0));
        [-38, 38].forEach((dx) => { const t = mk(x + dx, y + 14, 14, 14, 34, '#b8795a', '#e4b992', '#c99a74', 3); lmBox(t); items.push(spire(x + dx + H(t), y + 14 - t.h + 2, 16, 12, '#b8795a')); });
        break;
      }
      case 'albert': {
        items.push(cylinder(x, y + 8, 26, 12, 22, '#b9563f', '#a74a35'));
        items.push(dome(x, y - 14, 20, 8, 14, '#c3d9ec'));
        break;
      }
      case 'tower_bridge': {
        lmBox(mk(x, y, 14, 82, 3, '#f7f2e4', '#cfc9ba', '#b5afa0', 3), y - 80);
        [-38, 38].forEach((dy) => { const t = mk(x, y + dy, 18, 18, 52, '#7f93b5', '#c0c9da', '#9ea9bf', 3); lmBox(t); items.push(spire(x + H(t), y + dy - t.h + 3, 22, 20, '#6f84a8')); });
        break;
      }
    }
  });

  // ---------------------------------------------------------------- paint
  const outW = crop ? Math.round(crop.w * (crop.scale || 1)) : Math.round(W * scale);
  const outH = crop ? Math.round(crop.h * (crop.scale || 1)) : Math.round(H * scale);
  const canvas = createCanvas(outW, outH);
  const g = canvas.getContext('2d');
  if (crop) { g.scale(crop.scale || 1, crop.scale || 1); g.translate(-crop.x, -crop.y); } else g.scale(scale, scale);
  g.lineCap = 'round'; g.lineJoin = 'round';

  g.fillStyle = PALETTE.street; g.fillRect(-10, -10, W + 20, H + 20);

  // parks
  data.parks.forEach((p, i) => {
    g.fillStyle = PALETTE.parkPath; g.fill(parkPaths[i]);
    g.save(); g.clip(parkPaths[i]);
    g.fillStyle = PALETTE.park; g.fillRect(-10, -10, W + 20, H + 20);
    // mown patches
    for (let k = 0; k < 40; k++) {
      const c = p[Math.floor(rnd() * p.length)];
      g.fillStyle = rnd() < 0.5 ? 'rgba(130,200,50,0.5)' : 'rgba(190,230,90,0.45)';
      g.beginPath(); g.ellipse(c[0] + rr(-90, 90), c[1] + rr(-70, 70), rr(30, 90), rr(20, 60), rr(0, 3), 0, 7); g.fill();
    }
    // straight paths across the lawn
    g.strokeStyle = PALETTE.parkPath; g.lineWidth = 3.2;
    const m = Math.min(9, Math.max(3, Math.floor(p.length / 12)));
    for (let k = 0; k < m; k++) {
      const a = p[Math.floor(rnd() * p.length)], b = p[Math.floor(rnd() * p.length)];
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    }
    g.restore();
    g.strokeStyle = '#69a22f'; g.lineWidth = 3; g.stroke(parkPaths[i]);
  });

  // river
  g.strokeStyle = PALETTE.line; g.lineWidth = rv.width + 6; g.stroke(riverPath);
  piecePaths.forEach((p) => { g.lineWidth = 6; g.stroke(p); });
  g.strokeStyle = PALETTE.water; g.lineWidth = rv.width; g.stroke(riverPath);
  g.fillStyle = PALETTE.water; piecePaths.forEach((p) => g.fill(p));
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = rv.width * 0.5; g.stroke(riverPath);
  g.strokeStyle = PALETTE.waterLine; g.lineWidth = 1.7; g.setLineDash([140, 36, 70, 44]);
  [-0.2, 0.17].forEach((k) => { g.save(); g.translate(0, rv.width * k); g.stroke(riverPath); g.restore(); });
  g.setLineDash([]);
  // "RIVER — THAMES" lettered along the river, letter by letter
  {
    const line = rv.center.slice(2, 8);
    const seg = []; let total = 0;
    for (let i = 0; i < line.length - 1; i++) { const l = Math.hypot(line[i + 1][0] - line[i][0], line[i + 1][1] - line[i][1]); seg.push({ a: line[i], b: line[i + 1], l, s0: total }); total += l; }
    const letters = 'RIVER-THAMES'.split('');
    const gap = 40, span = gap * (letters.length - 1);
    let at = (total - span) / 2 + 10;
    g.fillStyle = '#2f4a80'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 700 34px Georgia, "Times New Roman", serif';
    letters.forEach((ch) => {
      const sg = seg.find((q) => at >= q.s0 && at <= q.s0 + q.l) || seg[seg.length - 1];
      const t = (at - sg.s0) / sg.l, x = sg.a[0] + (sg.b[0] - sg.a[0]) * t, y = sg.a[1] + (sg.b[1] - sg.a[1]) * t - 2;
      g.save(); g.translate(x, y); g.rotate(Math.atan2(sg.b[1] - sg.a[1], sg.b[0] - sg.a[0]));
      if (ch === '-') { g.fillRect(-9, -1.5, 18, 3); } else g.fillText(ch, 0, 0);
      g.restore(); at += gap;
    });
  }
  stamp('ground');

  // buildings & trees, back to front
  items.sort((a, b) => a.y - b.y);
  items.forEach((it) => it.draw(g));
  stamp('items drawn');

  if (drawRoads) drawRoadLayer(g);
  if (drawLabels) drawLabelLayer(g);
  if (drawStations) data.stations.forEach((s) => drawPill(g, s));
  stamp('done');
  return canvas;

  // ---------------------------------------------------------------- roads
  function offsetPath(g2, pts, off, from, to) {
    g2.beginPath();
    let started = false;
    for (let i = from; i <= to; i++) {
      const p = pts[i], x = p.x + p.nx * off, y = p.y + p.ny * off;
      if (!started) { g2.moveTo(x, y); started = true; } else g2.lineTo(x, y);
    }
    g2.stroke();
  }
  function drawRoadLayer(g2) {
    // white corridors first so every extruded roof is cut cleanly at the kerb
    g2.strokeStyle = PALETTE.street;
    roads.forEach((r) => {
      g2.lineWidth = r.half * 2 - 1;
      g2.beginPath(); r.pts.forEach((p, i) => (i ? g2.lineTo(p.x, p.y) : g2.moveTo(p.x, p.y))); g2.stroke();
    });
    // bridges: dark parapets where a road crosses water
    roads.forEach((r) => {
      const inW = r.pts.map((p) => isWater(p.x, p.y));
      let i = 0;
      while (i < r.pts.length) {
        if (!inW[i]) { i++; continue; }
        let j = i; while (j + 1 < r.pts.length && inW[j + 1]) j++;
        const from = Math.max(0, i - 2), to = Math.min(r.pts.length - 1, j + 2);
        g2.strokeStyle = PALETTE.line; g2.lineWidth = r.half * 2 + 5; g2.lineCap = 'butt';
        offsetPath(g2, r.pts, 0, from, to);
        g2.strokeStyle = '#fffdf6'; g2.lineWidth = r.half * 2 - 1;
        offsetPath(g2, r.pts, 0, from, to);
        g2.lineCap = 'round';
        i = j + 1;
      }
    });
    // route lines
    roads.forEach((r) => {
      const last = r.pts.length - 1;
      const lanes = [];
      if (r.ug) lanes.push('ug');
      if (r.taxi) lanes.push('taxi');
      if (r.bus) lanes.push('bus');
      const widths = { ug: 5, taxi: 6.4, bus: 4.4 };
      const total = lanes.reduce((s, k) => s + widths[k] + 0.6, 0);
      let cursor = -total / 2;
      lanes.forEach((k) => {
        const off = cursor + (widths[k] + 0.6) / 2; cursor += widths[k] + 0.6;
        if (k === 'taxi') {
          g2.strokeStyle = PALETTE.taxiEdge; g2.lineWidth = widths.taxi + 1.8; offsetPath(g2, r.pts, off, 0, last);
          g2.strokeStyle = PALETTE.taxi; g2.lineWidth = widths.taxi; offsetPath(g2, r.pts, off, 0, last);
          g2.strokeStyle = 'rgba(255,240,170,0.7)'; g2.lineWidth = 1.6; offsetPath(g2, r.pts, off, 0, last);
        } else if (k === 'bus') {
          g2.strokeStyle = '#2f9d86'; g2.lineWidth = widths.bus + 1.4; offsetPath(g2, r.pts, off, 0, last);
          g2.strokeStyle = PALETTE.bus; g2.lineWidth = widths.bus; offsetPath(g2, r.pts, off, 0, last);
        } else {
          g2.strokeStyle = PALETTE.ugBand; g2.lineWidth = widths.ug + 3; offsetPath(g2, r.pts, off, 0, last);
          g2.strokeStyle = PALETTE.ug; g2.lineWidth = widths.ug; g2.setLineDash([11, 7]); g2.lineCap = 'butt';
          offsetPath(g2, r.pts, off, 0, last);
          g2.setLineDash([]); g2.lineCap = 'round';
        }
      });
      if (r.ferry) {
        g2.strokeStyle = '#1f2f55'; g2.lineWidth = 4; g2.setLineDash([16, 11]); g2.lineCap = 'butt';
        offsetPath(g2, r.pts, 0, 0, last); g2.setLineDash([]); g2.lineCap = 'round';
      }
    });
  }

  // ---------------------------------------------------------------- number tags
  function drawPill(g2, s) {
    g2.save(); g2.translate(s.x, s.y); g2.scale(tagScale, tagScale);
    const x = 0, y = 0;
    const w = 31, h = 18; // half sizes
    const cap = (cy, up, fill) => {
      g2.fillStyle = fill; g2.strokeStyle = '#33220f'; g2.lineWidth = 4;
      g2.beginPath(); g2.ellipse(x, cy, 17, 12.5, 0, up ? Math.PI : 0, up ? 2 * Math.PI : Math.PI); g2.closePath(); g2.fill(); g2.stroke();
    };
    cap(y - h, true, s.bus ? '#58c4a7' : '#f5c23a');
    cap(y + h, false, '#f5c23a');
    g2.fillStyle = s.ug ? '#dc3b72' : PALETTE.pillFill; g2.strokeStyle = '#33220f'; g2.lineWidth = 4.4;
    g2.beginPath();
    const c = 9;
    g2.moveTo(x - w + c, y - h); g2.lineTo(x + w - c, y - h); g2.quadraticCurveTo(x + w, y - h, x + w, y - h + c);
    g2.lineTo(x + w, y + h - c); g2.quadraticCurveTo(x + w, y + h, x + w - c, y + h); g2.lineTo(x - w + c, y + h);
    g2.quadraticCurveTo(x - w, y + h, x - w, y + h - c); g2.lineTo(x - w, y - h + c); g2.quadraticCurveTo(x - w, y - h, x - w + c, y - h);
    g2.closePath(); g2.fill(); g2.stroke();
    g2.fillStyle = 'rgba(255,255,255,0.35)'; g2.fillRect(x - w + 6, y - h + 3.5, 2 * w - 12, 3);
    g2.fillStyle = s.ug ? '#ffffff' : '#25190b';
    g2.font = `800 ${String(s.id).length > 2 ? 27 : 30}px "Arial Black", Arial, Helvetica, sans-serif`;
    g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillText(String(s.id), x, y + 1.5);
    g2.restore();
  }

  // ---------------------------------------------------------------- tags and lettering
  function drawLabelLayer(g2) {
    const taken = data.stations.map((st) => ({ x0: st.x - (31 * tagScale + 12), x1: st.x + (31 * tagScale + 12), y0: st.y - (31 * tagScale + 8), y1: st.y + (31 * tagScale + 8) }));
    const place = (text, x, y, size) => {
      g2.font = `700 ${size}px Arial, Helvetica, sans-serif`;
      const wdt = g2.measureText(text).width + 10, hgt = size * 1.35;
      const offsets = [[0, 0], [0, -26], [0, 26], [-70, 0], [70, 0], [0, -48], [0, 48], [-110, -20], [110, -20], [-110, 24], [110, 24], [0, -72], [0, 72]];
      for (const [dx, dy] of offsets) {
        const r = { x0: x + dx - wdt / 2, x1: x + dx + wdt / 2, y0: y + dy - size * 0.85, y1: y + dy - size * 0.85 + hgt };
        if (!taken.some((t) => r.x0 < t.x1 && r.x1 > t.x0 && r.y0 < t.y1 && r.y1 > t.y0)) { taken.push(r); return { x: x + dx, y: y + dy, wdt, hgt }; }
      }
      return null;
    };
    labelList.forEach(([text, x, y, size]) => {
      const at = place(text, x, y, size || 12);
      if (!at) return;
      g2.font = `700 ${size || 12}px Arial, Helvetica, sans-serif`;
      g2.fillStyle = 'rgba(255,255,255,0.9)'; g2.strokeStyle = 'rgba(58,36,26,0.65)'; g2.lineWidth = 1;
      g2.beginPath(); g2.roundRect(at.x - at.wdt / 2, at.y - (size || 12) * 0.85, at.wdt, at.hgt, 3); g2.fill(); g2.stroke();
      g2.fillStyle = '#3a2a22'; g2.textAlign = 'center'; g2.textBaseline = 'alphabetic';
      g2.fillText(text, at.x, at.y + 1);
    });
  }
}
