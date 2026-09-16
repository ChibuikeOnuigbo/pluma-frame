// Chibuike geometry — rects, rotation math, point simplification, snapping.
// Written by Chibuike; pure functions so tests can hammer them headlessly.

export interface ChibuikeRect { x: number; y: number; w: number; h: number; }
export interface ChibuikePt { x: number; y: number; }

export const chibuikeClamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const chibuikeLerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const chibuikeRound2 = (v: number) => Math.round(v * 100) / 100;

export function chibuikeRectsIntersect(a: ChibuikeRect, b: ChibuikeRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function chibuikeRectsUnion(list: ChibuikeRect[]): ChibuikeRect | null {
  if (!list.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const r of list) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function chibuikePointInRect(px: number, py: number, r: ChibuikeRect): boolean {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Rotate point p around center c by deg degrees. */
export function chibuikeRotatePt(p: ChibuikePt, c: ChibuikePt, deg: number): ChibuikePt {
  if (!deg) return { ...p };
  const rad = (deg * Math.PI) / 180, cos = Math.cos(rad), sin = Math.sin(rad);
  const dx = p.x - c.x, dy = p.y - c.y;
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos };
}

/** Axis-aligned bounds of a rotated rect (doc space). */
export function chibuikeRotatedBounds(r: ChibuikeRect, deg: number): ChibuikeRect {
  if (!deg) return { ...r };
  const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
  const corners = [
    { x: r.x, y: r.y }, { x: r.x + r.w, y: r.y },
    { x: r.x, y: r.y + r.h }, { x: r.x + r.w, y: r.y + r.h },
  ].map(p => chibuikeRotatePt(p, { x: cx, y: cy }, deg));
  const xs = corners.map(p => p.x), ys = corners.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

/** Ramer–Douglas–Peucker — a scribble must not become ten thousand points. */
export function chibuikeSimplify(pts: ChibuikePt[], eps = 1.5): ChibuikePt[] {
  if (pts.length < 3) return pts.slice();
  const keep = new Array<boolean>(pts.length).fill(false);
  keep[0] = keep[pts.length - 1] = true;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let maxD = 0, idx = -1;
    const pa = pts[a], pb = pts[b];
    const dx = pb.x - pa.x, dy = pb.y - pa.y;
    const len = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i].x - dx * pts[i].y + pb.x * pa.y - pb.y * pa.x) / len;
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD > eps) { keep[idx] = true; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/* ── Chibuike snapping engine ──────────────────────────────────────────────
   Candidate guide lines come from: canvas edges/center, other objects'
   edges/centers, safe-area margins. Threshold is in *screen* px so the feel
   is identical at every zoom. */
export interface ChibuikeGuide { pos: number; dir: 'v' | 'h'; }
export interface ChibuikeSnapResult { dx: number; dy: number; guides: ChibuikeGuide[]; }

export function chibuikeSnapMove(
  moving: ChibuikeRect,
  others: ChibuikeRect[],
  docW: number, docH: number,
  thresholdDoc: number,
  withGrid?: { size: number } | null,
): ChibuikeSnapResult {
  const xs: number[] = [0, docW / 2, docW];
  const ys: number[] = [0, docH / 2, docH];
  const M = Math.round(Math.min(docW, docH) * 0.05); // safe margin
  xs.push(M, docW - M); ys.push(M, docH - M);
  for (const o of others) {
    xs.push(o.x, o.x + o.w / 2, o.x + o.w);
    ys.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  const guides: ChibuikeGuide[] = [];
  let dx = 0, dy = 0, bestX = thresholdDoc, bestY = thresholdDoc;
  const myXs = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
  const myYs = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];
  for (const gx of xs) {
    for (const mx of myXs) {
      const d = gx - mx;
      if (Math.abs(d) < bestX) { bestX = Math.abs(d); dx = d; guides.push({ pos: gx, dir: 'v' }); }
    }
  }
  for (const gy of ys) {
    for (const my of myYs) {
      const d = gy - my;
      if (Math.abs(d) < bestY) { bestY = Math.abs(d); dy = d; guides.push({ pos: gy, dir: 'h' }); }
    }
  }
  if (guides.filter(g => g.dir === 'v').length === 0) dx = 0;
  if (guides.filter(g => g.dir === 'h').length === 0) dy = 0;
  if (withGrid && Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    const gx = Math.round(moving.x / withGrid.size) * withGrid.size;
    const gy = Math.round(moving.y / withGrid.size) * withGrid.size;
    if (Math.abs(gx - moving.x) < thresholdDoc) dx = gx - moving.x;
    if (Math.abs(gy - moving.y) < thresholdDoc) dy = gy - moving.y;
  }
  return { dx, dy, guides: guides.slice(-4) };
}
