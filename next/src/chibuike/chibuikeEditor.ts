/**
 * Chibuike editor chrome — everything drawn ON TOP of the scene that must
 * NEVER reach an export: selection frames, handles, snap guides, marquee,
 * crop shading, grid overlay, checkerboard.
 */
import { ChibuikeDoc, ChibuikeObject } from './chibuikeTypes';
import { chibuikePaintScene } from './chibuikeRender';
import { chibuikeObjectBounds } from './chibuikeDoc';
import { chibuikeRotatePt, chibuikePointInRect, ChibuikePt, ChibuikeRect } from './chibuikeGeom';
import { chibuikeHasTilt } from './chibuikeWarp';
import { store } from './chibuikeStore';

export const CHIBUIKE_HANDLE = 8; // screen px half-size of a handle

export type ChibuikeHandle =
  | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'
  | 'rotate' | 'move'
  | 'a-start' | 'a-end' | 'a-curve' | 'tail' | 'crop-nw' | 'crop-n' | 'crop-ne' | 'crop-e' | 'crop-se' | 'crop-s' | 'crop-sw' | 'crop-w';

/* ── checkerboard for transparency ──────────────────────────────────────── */
let checkerPattern: CanvasPattern | null = null;
export function chibuikeChecker(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (checkerPattern) return checkerPattern;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const pctx = c.getContext('2d')!;
  pctx.fillStyle = '#e9ecf2'; pctx.fillRect(0, 0, 16, 16);
  pctx.fillStyle = '#d6dae4'; pctx.fillRect(0, 0, 8, 8); pctx.fillRect(8, 8, 8, 8);
  checkerPattern = ctx.createPattern(c, 'repeat');
  return checkerPattern;
}

/* ── transforms ─────────────────────────────────────────────────────────── */
export function chibuikeDocToScreenPt(p: ChibuikePt): ChibuikePt {
  return store.docToScreen(p.x, p.y);
}

/* ── hit testing (scene-level, topmost first) ───────────────────────────── */
export function chibuikeHitTest(doc: ChibuikeDoc, px: number, py: number): ChibuikeObject | null {
  for (let i = doc.objects.length - 1; i >= 0; i--) {
    const o = doc.objects[i];
    if (!o.visible || o.locked) continue;
    if (chibuikeObjectHit(doc, o, px, py)) return o;
  }
  return null;
}

export function chibuikeObjectHit(doc: ChibuikeDoc, o: ChibuikeObject, px: number, py: number): boolean {
  // rotate point into object space
  let lx = px, ly = py;
  if (o.rotation) {
    const b = chibuikeObjectBounds(o);
    const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    const p = chibuikeRotatePt({ x: px, y: py }, c, -o.rotation);
    lx = p.x; ly = p.y;
  }
  const pad = 6 / store.viewport.zoom;
  switch (o.kind) {
    case 'line': case 'arrow': {
      const dx = o.x2 - o.x, dy = o.y2 - o.y;
      const len2 = dx * dx + dy * dy || 1;
      let t = ((lx - o.x) * dx + (ly - o.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const qx = o.x + t * dx, qy = o.y + t * dy;
      const dist = Math.hypot(lx - qx, ly - qy);
      if (o.kind === 'arrow' && o.curve) {
        // also test the bulge midpoint region
        const mx = (o.x + o.x2) / 2 - (dy / Math.sqrt(len2)) * o.curve * Math.sqrt(len2) * 0.25;
        const my = (o.y + o.y2) / 2 + (dx / Math.sqrt(len2)) * o.curve * Math.sqrt(len2) * 0.25;
        const dm = Math.hypot(lx - mx, ly - my);
        return Math.min(dist, dm) < (o.width + 10) / store.viewport.zoom + pad;
      }
      return dist < (o.width + 10) / store.viewport.zoom + pad;
    }
    case 'pen': {
      const tol = (o.width + 8) / store.viewport.zoom + pad;
      for (let i = 1; i < o.points.length; i++) {
        const a = o.points[i - 1], b = o.points[i];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len2 = dx * dx + dy * dy || 1;
        let t = ((lx - a.x) * dx + (ly - a.y) * dy) / len2;
        t = Math.max(0, Math.min(1, t));
        if (Math.hypot(lx - (a.x + t * dx), ly - (a.y + t * dy)) < tol) return true;
      }
      return false;
    }
    case 'ellipse': {
      const nx = (lx - (o.x + o.w / 2)) / (o.w / 2 + pad);
      const ny = (ly - (o.y + o.h / 2)) / (o.h / 2 + pad);
      return nx * nx + ny * ny <= 1.06;
    }
    case 'number': case 'qr': case 'icon': case 'badge': {
      return chibuikePointInRect(lx, ly, { x: o.x - pad, y: o.y - pad, w: o.w + pad * 2, h: o.h + pad * 2 });
    }
    default: {
      const b = chibuikeObjectBounds(o);
      return chibuikePointInRect(lx, ly, { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 });
    }
  }
}

/* ── selection frame + handles ──────────────────────────────────────────── */
export function chibuikeHandlePositionsScreen(o: ChibuikeObject): Record<string, ChibuikePt> {
  const b = chibuikeObjectBounds(o);
  const rot = o.rotation;
  const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
  const corners = {
    nw: { x: b.x, y: b.y }, n: { x: c.x, y: b.y }, ne: { x: b.x + b.w, y: b.y },
    e: { x: b.x + b.w, y: c.y }, se: { x: b.x + b.w, y: b.y + b.h }, s: { x: c.x, y: b.y + b.h },
    sw: { x: b.x, y: b.y + b.h }, w: { x: b.x, y: c.y },
  };
  const out: Record<string, ChibuikePt> = {};
  for (const [k, p] of Object.entries(corners)) {
    const rp = rot ? chibuikeRotatePt(p, c, rot) : p;
    out[k] = store.docToScreen(rp.x, rp.y);
  }
  const topMid = store.docToScreen(c.x, b.y);
  out.rotate = { x: topMid.x, y: topMid.y - 24 };
  return out;
}

export function chibuikeHandleAtScreen(o: ChibuikeObject, sx: number, sy: number): ChibuikeHandle | null {
  const hs = chibuikeHandlePositionsScreen(o);
  const R = CHIBUIKE_HANDLE + 4;
  if (hs.rotate && Math.hypot(hs.rotate.x - sx, hs.rotate.y - sy) < R) return 'rotate';
  for (const k of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const) {
    if (hs[k] && Math.hypot(hs[k].x - sx, hs[k].y - sy) < R) return k as ChibuikeHandle;
  }
  // special handles
  const kind = o.kind;
  if (kind === 'arrow' || kind === 'line') {
    const a = store.docToScreen(o.x, o.y), e = store.docToScreen(o.x2, o.y2);
    if (Math.hypot(a.x - sx, a.y - sy) < R) return 'a-start';
    if (Math.hypot(e.x - sx, e.y - sy) < R) return 'a-end';
    if (kind === 'arrow') {
      const m = store.docToScreen((o.x + o.x2) / 2, (o.y + o.y2) / 2);
      if (Math.hypot(m.x - sx, m.y - sy) < R) return 'a-curve';
    }
  }
  if (kind === 'callout') {
    const t = store.docToScreen(o.tailX, o.tailY);
    if (Math.hypot(t.x - sx, t.y - sy) < R) return 'tail';
  }
  return null;
}

/* ── rotate-aware resize math ───────────────────────────────────────────── */
export interface ChibuikeResizeOutcome { x: number; y: number; w: number; h: number; x2?: number; y2?: number; tailX?: number; tailY?: number; }

export function chibuikeResizeObject(
  o: ChibuikeObject, handle: ChibuikeHandle,
  startBounds: ChibuikeRect, startMouseDoc: ChibuikePt, curMouseDoc: ChibuikePt,
  keepAspect: boolean, fromCenter: boolean,
): ChibuikeResizeOutcome {
  const c0 = { x: startBounds.x + startBounds.w / 2, y: startBounds.y + startBounds.h / 2 };
  // to object-local space (rotation removed), relative to center
  const toLocal = (p: ChibuikePt) => chibuikeRotatePt(p, c0, -o.rotation);
  const l0 = toLocal(startMouseDoc);
  const l1 = toLocal(curMouseDoc);
  const d = { x: l1.x - l0.x, y: l1.y - l0.y };
  let { x, y, w, h } = startBounds;
  const east = handle.includes('e'), west = handle.includes('w');
  const north = handle.includes('n'), south = handle.includes('s');
  let nx = x, ny = y, nw = w, nh = h;
  if (east) nw = w + d.x;
  if (west) { nw = w - d.x; nx = x + d.x; }
  if (south) nh = h + d.y;
  if (north) { nh = h - d.y; ny = y + d.y; }
  if (keepAspect && nw > 0 && nh > 0) {
    const ar = w / h;
    if (east || west) { const t = nw / ar * (north || south ? 1 : 0) || nw / ar; nh = nw / ar; if (north) ny = y + (h - nh); }
    else { nw = nh * ar; if (west) nx = x + (w - nw); }
  }
  if (nw < 4) nw = 4; if (nh < 4) nh = 4;
  if (fromCenter) {
    const cx = x + w / 2, cy = y + h / 2;
    nx = cx - nw / 2; ny = cy - nh / 2;
  }
  // recompute doc-space position: local top-left back to doc space around the (possibly moving) center
  const c1 = fromCenter ? c0 : {
    x: nx + nw / 2, y: ny + nh / 2,
  };
  const anchorLocal = { x: nx + nw / 2, y: ny + nh / 2 };
  const anchorDoc = chibuikeRotatePt(anchorLocal, c0, o.rotation);
  const outX = anchorDoc.x - nw / 2;
  const outY = anchorDoc.y - nh / 2;
  const outcome: ChibuikeResizeOutcome = { x: outX, y: outY, w: nw, h: nh };
  if (o.kind === 'arrow' || o.kind === 'line') {
    // endpoints follow the box in the direction of the drag
    const sx = (outX - startBounds.x) / startBounds.w, sy = (outY - startBounds.y) / startBounds.h;
    const sw = nw / startBounds.w, sh = nh / startBounds.h;
    const mapPt = (px: number, py: number) => ({
      x: outX + (px - startBounds.x) * sw,
      y: outY + (py - startBounds.y) * sh,
    });
    const p1 = mapPt(startBounds.x, startBounds.y);
    const p2 = mapPt(startBounds.x + startBounds.w, startBounds.y + startBounds.h);
    outcome.x = p1.x; outcome.y = p1.y;
    outcome.w = Math.abs(p2.x - p1.x); outcome.h = Math.abs(p2.y - p1.y);
    outcome.x2 = p2.x; outcome.y2 = p2.y;
  }
  return outcome;
}

/* ── the chrome painter ─────────────────────────────────────────────────── */
export function chibuikePaintEditor(
  ctx: CanvasRenderingContext2D,
  doc: ChibuikeDoc,
  opts: { dpr: number; hoverId: string | null; time: number },
): void {
  const { zoom, panX, panY } = store.viewport;
  const W = doc.width * zoom, H = doc.height * zoom;
  const ox = panX, oy = panY;

  ctx.clearRect(0, 0, ctx.canvas.width / opts.dpr, ctx.canvas.height / opts.dpr);
  // canvas backdrop + checkerboard under transparent docs
  if (doc.background.type === 'transparent' || (doc.exportSettings.transparent && false)) {
    const pat = chibuikeChecker(ctx);
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(ox, oy, W, H); }
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(zoom, zoom);
  chibuikePaintScene(ctx, doc, { time: store.playing || store.playhead > 0 ? opts.time : undefined, lowEnd: store.perf.lowEnd });
  ctx.restore();

  // doc border
  ctx.save();
  ctx.strokeStyle = 'rgba(120,130,160,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 0.5, oy - 0.5, W + 1, H + 1);
  ctx.restore();

  // grid overlay (editor-only)
  const g = store.gridOverlay;
  if (g.enabled) {
    ctx.save();
    ctx.globalAlpha = g.opacity;
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 1;
    const step = g.spacing * zoom;
    let i = 0;
    for (let x = ox; x <= ox + W + 0.5; x += step, i++) {
      ctx.globalAlpha = g.opacity * (i % g.majorEvery === 0 ? 1.6 : 1);
      ctx.beginPath(); ctx.moveTo(x, oy); ctx.lineTo(x, oy + H); ctx.stroke();
    }
    i = 0;
    for (let y = oy; y <= oy + H + 0.5; y += step, i++) {
      ctx.globalAlpha = g.opacity * (i % g.majorEvery === 0 ? 1.6 : 1);
      ctx.beginPath(); ctx.moveTo(ox, y); ctx.lineTo(ox + W, y); ctx.stroke();
    }
    ctx.restore();
  }

  const sel = store.selected();

  // hovered outline (only when nothing selected or hovering something else)
  if (opts.hoverId && !sel.some(s => s.id === opts.hoverId) && !store.marquee) {
    const o = doc.objects.find(x => x.id === opts.hoverId);
    if (o) {
      const b = chibuikeObjectBounds(o);
      ctx.save();
      ctx.strokeStyle = 'rgba(124,92,255,0.55)';
      ctx.lineWidth = 1.5;
      const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
      if (o.rotation) {
        ctx.translate(c.x, c.y); ctx.rotate((o.rotation * Math.PI) / 180); ctx.translate(-c.x, -c.y);
      }
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }
  }

  // selection
  for (const o of sel) {
    const b = chibuikeObjectBounds(o);
    ctx.save();
    ctx.strokeStyle = '#7c5cff';
    ctx.lineWidth = 1.5;
    const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    if (o.rotation) {
      ctx.translate(c.x, c.y); ctx.rotate((o.rotation * Math.PI) / 180); ctx.translate(-c.x, -c.y);
    }
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
  if (sel.length === 1) {
    const o = sel[0];
    const hs = chibuikeHandlePositionsScreen(o);
    ctx.save();
    for (const k of ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const) {
      const p = hs[k];
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#7c5cff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(p.x - CHIBUIKE_HANDLE / 2, p.y - CHIBUIKE_HANDLE / 2, CHIBUIKE_HANDLE, CHIBUIKE_HANDLE);
      ctx.fill(); ctx.stroke();
    }
    // rotate handle
    const rp = hs.rotate;
    ctx.beginPath(); ctx.arc(rp.x, rp.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#7c5cff'; ctx.fill();
    ctx.strokeStyle = 'rgba(124,92,255,.4)';
    ctx.beginPath(); ctx.moveTo(store.docToScreen(0, 0).x, 0);
    const topMid = chibuikeHandlePositionsScreen(o).n;
    ctx.moveTo(topMid.x, topMid.y); ctx.lineTo(rp.x, rp.y + 5); ctx.stroke();
    // special handles
    ctx.strokeStyle = '#7c5cff'; ctx.fillStyle = '#fff';
    const circle = (p: ChibuikePt) => { ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); };
    if (o.kind === 'arrow' || o.kind === 'line') {
      circle(store.docToScreen(o.x, o.y));
      circle(store.docToScreen(o.x2, o.y2));
      if (o.kind === 'arrow') circle(store.docToScreen((o.x + o.x2) / 2, (o.y + o.y2) / 2));
    }
    if (o.kind === 'callout') circle(store.docToScreen(o.tailX, o.tailY));
    ctx.restore();
  } else if (sel.length > 1) {
    const { chibuikeSelectionBounds } = chibuikeDocHelpers;
    const b = chibuikeSelectionBounds(sel);
    if (b) {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = '#7c5cff';
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      ctx.restore();
    }
  }

  // snap guides
  ctx.save();
  ctx.strokeStyle = '#ff5fd2';
  ctx.lineWidth = 1;
  for (const v of store.snapGuides.v) {
    const p = store.docToScreen(v, 0);
    ctx.beginPath(); ctx.moveTo(p.x, oy - 2000); ctx.lineTo(p.x, oy + H + 2000); ctx.stroke();
  }
  for (const h of store.snapGuides.h) {
    const p = store.docToScreen(0, h);
    ctx.beginPath(); ctx.moveTo(ox - 2000, p.y); ctx.lineTo(ox + W + 2000, p.y); ctx.stroke();
  }
  ctx.restore();

  // marquee
  if (store.marquee) {
    const m = store.marquee;
    const a = store.docToScreen(m.x, m.y);
    ctx.save();
    ctx.fillStyle = 'rgba(124,92,255,0.08)';
    ctx.strokeStyle = 'rgba(124,92,255,0.7)';
    ctx.lineWidth = 1;
    ctx.fillRect(a.x, a.y, m.w * zoom, m.h * zoom);
    ctx.strokeRect(a.x, a.y, m.w * zoom, m.h * zoom);
    ctx.restore();
  }

  // crop shading
  if (store.cropActive && store.cropRect && sel.length === 1 && sel[0].kind === 'image') {
    const c = store.cropRect;
    const a = store.docToScreen(c.x, c.y);
    ctx.save();
    ctx.fillStyle = 'rgba(10,12,18,0.55)';
    ctx.beginPath();
    ctx.rect(ox, oy, W, H);
    ctx.rect(a.x, a.y, c.w * zoom, c.h * zoom);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(a.x, a.y, c.w * zoom, c.h * zoom);
    // thirds guides
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(a.x + (c.w * zoom * i) / 3, a.y); ctx.lineTo(a.x + (c.w * zoom * i) / 3, a.y + c.h * zoom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.x, a.y + (c.h * zoom * i) / 3); ctx.lineTo(a.x + c.w * zoom, a.y + (c.h * zoom * i) / 3); ctx.stroke();
    }
    // corner handles
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#7c5cff';
    for (const [hx, hy] of [[a.x, a.y], [a.x + c.w * zoom, a.y], [a.x + c.w * zoom, a.y + c.h * zoom], [a.x, a.y + c.h * zoom]] as const) {
      ctx.beginPath(); ctx.rect(hx - 5, hy - 5, 10, 10); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  // text editing box hint
  if (store.editingTextId) {
    const o = doc.objects.find(x => x.id === store.editingTextId);
    if (o) {
      const b = chibuikeObjectBounds(o);
      ctx.save();
      ctx.strokeStyle = '#4cc2ff';
      ctx.setLineDash([4, 3]);
      ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      ctx.restore();
    }
  }
}

// tiny indirection to avoid an import cycle at module-eval time
import * as chibuikeDocHelpers from './chibuikeDoc';
