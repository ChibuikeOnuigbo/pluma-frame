/**
 * Chibuike interaction controller — explicit pointer state machine.
 * idle → hover → dragging | transforming | drawing | panning → idle.
 * Pointer capture is taken on down and released on up/cancel. Written by
 * Chibuike; panels and canvas never fight over events (separate boundaries).
 */
import { store, ChibuikeTool } from './chibuikeStore';
import { chibuikeHitTest, chibuikeHandleAtScreen, chibuikeResizeObject, ChibuikeHandle } from './chibuikeEditor';
import { chibuikeSnapMove, chibuikeSimplify, ChibuikePt, ChibuikeRect, chibuikeRotatedBounds, chibuikeClamp } from './chibuikeGeom';
import { chibuikeObjectBounds, chibuikeSelectionBounds } from './chibuikeDoc';
import type { ChibuikeObject } from './chibuikeTypes';
import { chibuikeAssets } from './chibuikeAssets';
import { chibuikeMakeText, chibuikeMakeRect, chibuikeMakeEllipse, chibuikeMakeArrow, chibuikeMakeLine, chibuikeMakeBlur, chibuikeMakeSpotlight, chibuikeMakeNumber, chibuikeMakeCallout, chibuikeMakeQr, chibuikeMakeBadge, chibuikeMakeIcon, chibuikeMakeMagnify, chibuikeMakePen } from './chibuikeFactories';
import { chibuikeSimplify as simp } from './chibuikeGeom';

type Mode = 'idle' | 'panning' | 'moving' | 'transforming' | 'drawing' | 'marquee' | 'crop';

interface DragState {
  mode: Mode;
  startDoc: ChibuikePt;
  lastDoc: ChibuikePt;
  handle: ChibuikeHandle | null;
  startBounds: Map<string, ChibuikeRect>;
  startPointFields: Map<string, { x2?: number; y2?: number; tailX?: number; tailY?: number }>;
  moved: boolean;
  drawObjId: string | null;
  penPoints: ChibuikePt[];
  space: boolean;
  dupMode: boolean;
}

export class ChibuikePointerController {
  private el: HTMLCanvasElement;
  private drag: DragState | null = null;
  private hoverId: string | null = null;
  private spaceDown = false;
  onHoverChange?: (id: string | null) => void;
  detachFns: (() => void)[] = [];

  constructor(el: HTMLCanvasElement) {
    this.el = el;
    const on = <K extends keyof HTMLElementEventMap>(type: K | string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as EventListener, opts);
      this.detachFns.push(() => el.removeEventListener(type, fn as EventListener));
    };
    on('pointerdown', this.onDown);
    on('pointermove', this.onMove);
    on('pointerup', this.onUp);
    on('pointercancel', this.onUp);
    on('pointerleave', () => { this.setHover(null); });
    on('wheel', this.onWheel as (e: never) => void, { passive: false });
    on('dblclick', this.onDblClick);
    on('contextmenu', this.onContext);
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space' && !store.isTypingTarget(e.target)) this.spaceDown = true; };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') this.spaceDown = false; };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    this.detachFns.push(() => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); });
  }

  detach(): void { this.detachFns.forEach(f => f()); this.detachFns = []; }

  /** read-only hover id for the render loop */
  get hoverIdPublic(): string | null { return this.hoverId; }

  private docPt(e: PointerEvent | MouseEvent | WheelEvent): ChibuikePt {
    const r = this.el.getBoundingClientRect();
    return store.screenToDoc(e.clientX - r.left, e.clientY - r.top);
  }
  private screenPt(e: PointerEvent | MouseEvent): ChibuikePt {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private setHover(id: string | null) {
    if (this.hoverId !== id) { this.hoverId = id; this.onHoverChange?.(id); store.bumpRev(); }
    this.el.style.cursor = this.cursorFor(id);
  }

  private cursorFor(id: string | null): string {
    if (this.drag) {
      if (this.drag.mode === 'panning') return 'grabbing';
      if (this.drag.mode === 'moving') return 'move';
      return 'crosshair';
    }
    if (this.spaceDown || store.tool === 'hand') return 'grab';
    const tool = store.tool;
    if (tool !== 'select' && tool !== 'crop') return 'crosshair';
    return id ? 'move' : 'default';
  }

  /* ── pointer down ── */
  private onDown = (e: PointerEvent) => {
    if (e.button === 1 || this.spaceDown || store.tool === 'hand') {
      this.drag = { mode: 'panning', startDoc: this.docPt(e), lastDoc: this.docPt(e), handle: null, startBounds: new Map(), startPointFields: new Map(), moved: false, drawObjId: null, penPoints: [], space: true, dupMode: false };
      this.el.setPointerCapture(e.pointerId);
      this.el.style.cursor = 'grabbing';
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    this.el.setPointerCapture(e.pointerId);
    const sp = this.screenPt(e);
    const dp = this.docPt(e);
    const tool = store.tool as ChibuikeTool;

    // crop mode interactions
    if (store.cropActive) {
      this.drag = { mode: 'crop', startDoc: dp, lastDoc: dp, handle: this.cropHandleAt(sp), startBounds: new Map(), startPointFields: new Map(), moved: false, drawObjId: null, penPoints: [], space: false, dupMode: false };
      return;
    }

    if (tool === 'select') {
      const sel = store.selected();
      // handles of single selection first
      if (sel.length === 1) {
        const h = chibuikeHandleAtScreen(sel[0], sp.x, sp.y);
        if (h) {
          const o = sel[0];
          const b = chibuikeObjectBounds(o);
          this.drag = {
            mode: 'transforming', startDoc: dp, lastDoc: dp, handle: h,
            startBounds: new Map([[o.id, b]]),
            startPointFields: new Map([[o.id, { x2: o.kind === 'arrow' || o.kind === 'line' ? o.x2 : undefined, y2: o.kind === 'arrow' || o.kind === 'line' ? o.y2 : undefined, tailX: o.kind === 'callout' ? o.tailX : undefined, tailY: o.kind === 'callout' ? o.tailY : undefined }]]),
            moved: false, drawObjId: null, penPoints: [], space: false, dupMode: false,
          };
          store.history.begin('Transform');
          return;
        }
      }
      const hit = chibuikeHitTest(store.doc, dp.x, dp.y);
      if (hit) {
        // select group members together
        let ids = [hit.id];
        if (hit.groupId) ids = store.doc.objects.filter(o => o.groupId === hit.groupId).map(o => o.id);
        const additive = e.shiftKey, subtractive = e.altKey;
        if (!store.selection.includes(hit.id) && !additive) store.select(ids);
        else if (additive || subtractive) store.select(ids, additive && !subtractive, subtractive);
        // alt-drag = duplicate then move the clones
        if (e.altKey) store.duplicateSelection();
        const startBounds = new Map<string, ChibuikeRect>();
        const startPts = new Map<string, { x2?: number; y2?: number; tailX?: number; tailY?: number }>();
        for (const o of store.selected()) {
          startBounds.set(o.id, chibuikeObjectBounds(o));
          startPts.set(o.id, {
            x2: o.kind === 'arrow' || o.kind === 'line' ? o.x2 : undefined,
            y2: o.kind === 'arrow' || o.kind === 'line' ? o.y2 : undefined,
            tailX: o.kind === 'callout' ? o.tailX : undefined,
            tailY: o.kind === 'callout' ? o.tailY : undefined,
          });
        }
        this.drag = { mode: 'moving', startDoc: dp, lastDoc: dp, handle: null, startBounds, startPointFields: startPts, moved: false, drawObjId: null, penPoints: [], space: false, dupMode: e.altKey };
        store.history.begin('Move');
      } else {
        store.select([]);
        this.drag = { mode: 'marquee', startDoc: dp, lastDoc: dp, handle: null, startBounds: new Map(), startPointFields: new Map(), moved: false, drawObjId: null, penPoints: [], space: false, dupMode: false };
      }
      return;
    }

    /* ── drawing tools ── */
    if (tool === 'text') {
      const o = chibuikeMakeText('Your text', dp.x, dp.y - 20);
      o.size = Math.max(18, Math.round(store.doc.width / 28));
      o.color = '#1a1d27';
      store.addObjects([o], 'Add text');
      store.editingTextId = o.id;
      store.setTool('select');
      return;
    }
    if (tool === 'number') {
      const o = chibuikeMakeNumber(dp.x - 22, dp.y - 22, store.numberCounter++);
      store.addObjects([o], 'Add step');
      store.setTool('select');
      return;
    }
    if (tool === 'callout') {
      const o = chibuikeMakeCallout(dp.x, dp.y, 'Say something');
      store.addObjects([o], 'Add callout');
      store.setTool('select');
      return;
    }
    if (tool === 'badge') {
      const o = chibuikeMakeBadge(dp.x - 90, dp.y - 27);
      store.addObjects([o], 'Add badge');
      store.setTool('select');
      return;
    }
    if (tool === 'qr') {
      const o = chibuikeMakeQr(dp.x - 80, dp.y - 80, 'https://example.com');
      store.addObjects([o], 'Add QR');
      store.setTool('select');
      return;
    }
    if (tool === 'icon') {
      const o = chibuikeMakeIcon((window as unknown as { __chibuikeIconPath?: string }).__chibuikeIconPath ?? 'M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8z', dp.x - 24, dp.y - 24);
      store.addObjects([o], 'Add icon');
      store.setTool('select');
      return;
    }
    if (tool === 'emoji') {
      const o = chibuikeMakeText((window as unknown as { __chibuikeEmoji?: string }).__chibuikeEmoji ?? '🙂', dp.x - 28, dp.y - 28, { size: 56, weight: 400, autoFit: false, align: 'center' });
      o.w = 56; o.h = 64; o.name = 'Emoji';
      store.addObjects([o], 'Add emoji');
      store.setTool('select');
      return;
    }
    if (tool === 'magnify') {
      // find image under the click (even if behind)
      const hit = chibuikeHitTest(store.doc, dp.x, dp.y);
      const src = hit && (hit.kind === 'image' || hit.kind === 'mockup') ? hit : store.selected().find(o => o.kind === 'image');
      if (src && src.kind === 'image' && src.assetId) {
        const reg = src.srcRect;
        const fracX = chibuikeClamp((dp.x - src.x) / src.w, 0, 1);
        const fracY = chibuikeClamp((dp.y - src.y) / src.h, 0, 1);
        const natW = src.srcRect?.sw ?? chibuikeAssetW(src.assetId);
        const natH = src.srcRect?.sh ?? chibuikeAssetH(src.assetId);
        const rw = natW * 0.22, rh = natH * 0.22;
        const o = chibuikeMakeMagnify(src.assetId, dp.x - 60, dp.y - 60, 120, {
          sx: (reg?.sx ?? 0) + fracX * natW - rw / 2,
          sy: (reg?.sy ?? 0) + fracY * natH - rh / 2,
          sw: rw, sh: rh,
        });
        store.addObjects([o], 'Add zoom cutout');
        store.setTool('select');
      } else {
        store.toast('Click on an image to place a zoom cutout.', 'info');
      }
      return;
    }

    // drag-drawn tools: rect, ellipse, arrow, line, blur, spotlight, pen, highlighter
    store.history.begin('Draw');
    let obj = null;
    if (tool === 'rect') obj = chibuikeMakeRect(dp.x, dp.y, { w: 1, h: 1 });
    else if (tool === 'ellipse') obj = chibuikeMakeEllipse(dp.x, dp.y, { w: 1, h: 1 });
    else if (tool === 'arrow') obj = chibuikeMakeArrow(dp.x, dp.y, dp.x, dp.y);
    else if (tool === 'line') obj = chibuikeMakeLine(dp.x, dp.y, dp.x, dp.y);
    else if (tool === 'blur') obj = chibuikeMakeBlur(dp.x, dp.y, 1, 1);
    else if (tool === 'spotlight') obj = chibuikeMakeSpotlight(dp.x, dp.y, 1, 1);
    else if (tool === 'pen' || tool === 'highlighter') {
      obj = chibuikeMakePen([dp], tool === 'highlighter'
        ? { color: '#ffe94d', width: 22, alpha: 0.45, name: 'Highlight' }
        : { color: '#e11d48', width: 5, alpha: 1 });
    }
    if (obj) {
      store.doc.objects.push(obj);
      store.bumpRev();
      this.drag = { mode: 'drawing', startDoc: dp, lastDoc: dp, handle: null, startBounds: new Map(), startPointFields: new Map(), moved: false, drawObjId: obj.id, penPoints: [dp], space: false, dupMode: false };
    }
  };

  /* ── pointer move ── */
  private onMove = (e: PointerEvent) => {
    const dp = this.docPt(e);
    const sp = this.screenPt(e);
    if (!this.drag) {
      if (store.tool === 'select' && !store.cropActive) {
        const hit = chibuikeHitTest(store.doc, dp.x, dp.y);
        this.setHover(hit?.id ?? null);
        const sel = store.selected();
        if (sel.length === 1) {
          const h = chibuikeHandleAtScreen(sel[0], sp.x, sp.y);
          if (h) this.el.style.cursor = h === 'rotate' ? 'grab' : h.startsWith('a') || h === 'tail' ? 'crosshair' : `${h}-resize`;
        }
      }
      return;
    }
    const d = this.drag;
    const dx = dp.x - d.startDoc.x, dy = dp.y - d.startDoc.y;
    if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) d.moved = true;
    d.lastDoc = dp;

    if (d.mode === 'panning') {
      const v = store.viewport;
      v.panX += e.movementX; v.panY += e.movementY;
      store.bumpRev();
      return;
    }
    if (d.mode === 'marquee') {
      store.marquee = { x: Math.min(d.startDoc.x, dp.x), y: Math.min(d.startDoc.y, dp.y), w: Math.abs(dx), h: Math.abs(dy) };
      return;
    }
    if (d.mode === 'crop') { this.cropMove(dp, e); return; }
    if (d.mode === 'moving') {
      const snap = store.doc.guides.snap && !e.altKey;
      const primary = [...d.startBounds.values()][0];
      let sx = dx, sy = dy, guides: { v: number[]; h: number[] } = { v: [], h: [] };
      if (snap && primary) {
        const others = store.doc.objects.filter(o => !d.startBounds.has(o.id) && o.visible).map(o => chibuikeObjectBounds(o));
        const proposed: ChibuikeRect = { x: primary.x + dx, y: primary.y + dy, w: primary.w, h: primary.h };
        const res = chibuikeSnapMove(proposed, others, store.doc.width, store.doc.height, 8 / store.viewport.zoom);
        sx += res.dx; sy += res.dy;
        guides = { v: res.guides.filter(g => g.dir === 'v').map(g => g.pos), h: res.guides.filter(g => g.dir === 'h').map(g => g.pos) };
      }
      store.snapGuides = guides;
      const shiftAxis = e.shiftKey ? (Math.abs(dx) > Math.abs(dy) ? 'x' : 'y') : null;
      for (const o of store.doc.objects) {
        const b = d.startBounds.get(o.id);
        if (!b) continue;
        let nx = b.x + sx, ny = b.y + sy;
        if (shiftAxis === 'x') ny = b.y;
        if (shiftAxis === 'y') nx = b.x;
        if (o.kind === 'pen') {
          // pen strokes are absolute polylines — translate the points themselves
          o.points = o.points.map(p => ({ x: p.x + sx, y: p.y + sy }));
          const xs = o.points.map(p => p.x), ys = o.points.map(p => p.y);
          o.x = Math.min(...xs); o.y = Math.min(...ys);
          o.w = Math.max(...xs) - o.x; o.h = Math.max(...ys) - o.y;
          continue;
        }
        o.x = nx; o.y = ny;
        const pf = d.startPointFields.get(o.id);
        const anyO = o as unknown as { x2?: number; y2?: number; tailX?: number; tailY?: number };
        if (pf) {
          if (pf.x2 !== undefined) anyO.x2 = pf.x2 + sx;
          if (pf.y2 !== undefined) anyO.y2 = pf.y2 + sy;
          if (pf.tailX !== undefined) anyO.tailX = pf.tailX + sx;
          if (pf.tailY !== undefined) anyO.tailY = pf.tailY + sy;
        }
      }
      store.bumpRev();
      return;
    }
    if (d.mode === 'transforming' && d.handle) {
      const o = store.selected()[0];
      if (!o) return;
      const b0 = d.startBounds.get(o.id)!;
      if (d.handle === 'rotate') {
        const c = { x: b0.x + b0.w / 2, y: b0.y + b0.h / 2 };
        const a0 = Math.atan2(d.startDoc.y - c.y, d.startDoc.x - c.x);
        const a1 = Math.atan2(dp.y - c.y, dp.x - c.x);
        let deg = o.rotation + ((a1 - a0) * 180) / Math.PI;
        if (e.shiftKey) deg = Math.round(deg / 15) * 15;
        o.rotation = Math.round(deg * 10) / 10;
      } else if (d.handle === 'a-start' || d.handle === 'a-end' || d.handle === 'a-curve' || d.handle === 'tail') {
        const two = o as unknown as { x2: number; y2: number; curve: number; tailX: number; tailY: number };
        if (d.handle === 'a-start') { o.x = dp.x; o.y = dp.y; }
        else if (d.handle === 'a-end') { two.x2 = dp.x; two.y2 = dp.y; }
        else if (d.handle === 'a-curve' && o.kind === 'arrow') {
          const mx = (o.x + two.x2) / 2, my = (o.y + two.y2) / 2;
          const len = Math.hypot(two.x2 - o.x, two.y2 - o.y) || 1;
          const nx = -(two.y2 - o.y) / len, ny = (two.x2 - o.x) / len;
          two.curve = chibuikeClamp(((dp.x - mx) * nx + (dp.y - my) * ny) / (len * 0.25), -1.6, 1.6);
        } else if (d.handle === 'tail' && o.kind === 'callout') { two.tailX = dp.x; two.tailY = dp.y; }
      } else {
        const keepAspect = e.shiftKey || o.kind === 'image' || o.kind === 'mockup' || o.kind === 'qr' || o.kind === 'icon' || o.kind === 'number' || o.kind === 'badge';
        const out = chibuikeResizeObject(o, d.handle, b0, d.startDoc, dp, keepAspect, e.altKey);
        if (o.kind === 'arrow' || o.kind === 'line') {
          if (out.x2 !== undefined) o.x2 = out.x2;
          if (out.y2 !== undefined) o.y2 = out.y2;
          o.x = out.x; o.y = out.y;
          o.w = Math.abs(o.x2 - o.x); o.h = Math.abs(o.y2 - o.y);
        } else {
          o.x = out.x; o.y = out.y; o.w = out.w; o.h = out.h;
        }
      }
      store.bumpRev();
      return;
    }
    if (d.mode === 'drawing' && d.drawObjId) {
      const o = store.doc.objects.find(x => x.id === d.drawObjId);
      if (!o) return;
      if (o.kind === 'pen') {
        d.penPoints.push(dp);
        o.points = chibuikeSimplify(d.penPoints, 1.2 / store.viewport.zoom);
      } else {
        let x2 = dp.x, y2 = dp.y;
        if (e.shiftKey) {
          const w = dp.x - d.startDoc.x, h = dp.y - d.startDoc.y;
          const s = Math.max(Math.abs(w), Math.abs(h));
          x2 = d.startDoc.x + Math.sign(w || 1) * s;
          y2 = d.startDoc.y + Math.sign(h || 1) * s;
        }
        if (o.kind === 'arrow' || o.kind === 'line') {
          o.x2 = x2; o.y2 = y2;
          o.w = Math.abs(x2 - o.x); o.h = Math.abs(y2 - o.y);
        } else {
          o.x = Math.min(d.startDoc.x, x2); o.y = Math.min(d.startDoc.y, y2);
          o.w = Math.abs(x2 - d.startDoc.x); o.h = Math.abs(y2 - d.startDoc.y);
        }
      }
      store.bumpRev();
    }
  };

  /* ── pointer up ── */
  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (this.el.hasPointerCapture?.(e.pointerId)) this.el.releasePointerCapture(e.pointerId);
    if (!d) return;
    this.drag = null;
    store.snapGuides = { v: [], h: [] };
    if (d.mode === 'panning') { this.el.style.cursor = this.cursorFor(null); return; }
    if (d.mode === 'marquee') {
      const m = store.marquee;
      store.marquee = null;
      if (m && m.w > 3 && m.h > 3) {
        const ids = store.doc.objects.filter(o => o.visible && !o.locked && chibuikeRectsOverlapObj(o, m)).map(o => o.id);
        if (ids.length) store.select(ids, e.shiftKey);
      }
      return;
    }
    if (d.mode === 'drawing') {
      const o = store.doc.objects.find(x => x.id === d.drawObjId);
      if (o && d.moved) {
        store.history.commit();
        store.select([o.id]);
        if (o.kind !== 'pen') store.setTool('select');
      } else {
        // click without drag: drop a sensible default-sized object
        if (o) {
          if (o.kind === 'rect' || o.kind === 'ellipse') { o.w = o.kind === 'rect' ? 220 : 160; o.h = o.kind === 'rect' ? 140 : 160; }
          else if (o.kind === 'blur') { o.w = 220; o.h = 120; }
          else if (o.kind === 'spotlight') { o.w = 260; o.h = 180; }
          else if (o.kind === 'arrow') { o.x2 = o.x + 160; o.y2 = o.y + 90; o.w = 160; o.h = 90; }
          else if (o.kind === 'line') { o.x2 = o.x + 160; o.y2 = o.y; o.w = 160; o.h = 1; }
          store.history.commit();
          store.select([o.id]);
          store.setTool('select');
        } else store.history.cancel();
      }
      store.bumpReact();
      return;
    }
    if (d.moved) store.history.commit();
    else store.history.cancel();
    store.bumpReact();
  };

  /* ── crop helpers (crop rect == store.cropRect) ── */
  private cropHandleAt(sp: ChibuikePt): ChibuikeHandle | null {
    const c = store.cropRect;
    if (!c) return null;
    const hs: [ChibuikeHandle, ChibuikePt][] = [
      ['crop-nw', store.docToScreen(c.x, c.y)], ['crop-ne', store.docToScreen(c.x + c.w, c.y)],
      ['crop-se', store.docToScreen(c.x + c.w, c.y + c.h)], ['crop-sw', store.docToScreen(c.x, c.y + c.h)],
      ['crop-n', store.docToScreen(c.x + c.w / 2, c.y)], ['crop-s', store.docToScreen(c.x + c.w / 2, c.y + c.h)],
      ['crop-e', store.docToScreen(c.x + c.w, c.y + c.h / 2)], ['crop-w', store.docToScreen(c.x, c.y + c.h / 2)],
    ];
    for (const [k, p] of hs) if (Math.hypot(p.x - sp.x, p.y - sp.y) < 12) return k;
    if (sp.x > store.docToScreen(c.x, c.y).x && sp.x < store.docToScreen(c.x + c.w, c.y).x && sp.y > store.docToScreen(c.x, c.y).y && sp.y < store.docToScreen(c.x, c.y + c.h).y) return 'move';
    return null;
  }
  private cropMove(dp: ChibuikePt, e: PointerEvent) {
    const c = store.cropRect;
    const img = store.selected()[0];
    if (!c || !img) return;
    const dx = dp.x - this.drag!.lastDoc.x, dy = dp.y - this.drag!.lastDoc.y;
    const handle = this.drag!.handle;
    if (handle === 'move') {
      c.x = chibuikeClamp(c.x + dx, img.x, img.x + img.w - c.w);
      c.y = chibuikeClamp(c.y + dy, img.y, img.y + img.h - c.h);
    } else if (handle?.startsWith('crop-')) {
      const dir = handle.slice(5);
      if (dir.includes('w')) { c.x += dx; c.w -= dx; }
      if (dir.includes('e')) c.w += dx;
      if (dir.includes('n')) { c.y += dy; c.h -= dy; }
      if (dir.includes('s')) c.h += dy;
      if ((e.shiftKey || store.cropRatio) && c.w > 4 && c.h > 4) {
        const ar = store.cropRatio ?? (img.w / img.h);
        if (dir === 'se' || dir === 'ne') c.h = c.w / ar;
        if (dir === 'sw' || dir === 'nw') { c.h = c.w / ar; c.y -= 0; }
      }
      c.w = Math.max(8, c.w); c.h = Math.max(8, c.h);
    }
    this.drag!.lastDoc = dp;
    store.bumpRev();
  }

  /* ── wheel: zoom at cursor (ctrl+wheel pinch included) ── */
  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = this.el.getBoundingClientRect();
    const k = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    store.zoomBy(k, e.clientX - r.left, e.clientY - r.top);
  };

  private onDblClick = (e: MouseEvent) => {
    const dp = this.docPt(e);
    const hit = chibuikeHitTest(store.doc, dp.x, dp.y);
    if (hit && hit.kind === 'text') {
      store.select([hit.id]);
      store.editingTextId = hit.id;
    }
  };

  private onContext = (e: MouseEvent) => {
    if (store.tool === 'hand') e.preventDefault();
  };
}

function chibuikeRectsOverlapObj(o: { x: number; y: number; w: number; h: number; kind: string; x2?: number; y2?: number; points?: ChibuikePt[] }, m: ChibuikeRect): boolean {
  const pts = o as { x2?: number; y2?: number };
  const b = o.kind === 'arrow' || o.kind === 'line'
    ? { x: Math.min(o.x, pts.x2 ?? o.x), y: Math.min(o.y, pts.y2 ?? o.y), w: Math.abs((pts.x2 ?? o.x) - o.x), h: Math.abs((pts.y2 ?? o.y) - o.y) }
    : o;
  return b.x < m.x + m.w && b.x + b.w > m.x && b.y < m.y + m.h && b.y + b.h > m.y;
}

function chibuikeAssetW(id: string): number { return chibuikeAssets.get(id)?.w ?? 800; }
function chibuikeAssetH(id: string): number { return chibuikeAssets.get(id)?.h ?? 600; }
