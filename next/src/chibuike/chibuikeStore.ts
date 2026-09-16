/**
 * Chibuike store — the single owner of truth.
 *
 * React panels read through useSyncExternalStore and re-render only on
 * committed changes (store.reactRev). The canvas repaints from the live doc
 * whenever store.rev moves — including mid-drag transient bumps — so a
 * sidebar label change never repaints the world and a drag never re-renders
 * React. Handcrafted by Chibuike; zero external state libraries.
 */
import { useSyncExternalStore } from 'react';
import {
  ChibuikeDoc, ChibuikeObject, ChibuikeAssetRef, ChibuikeBlend,
} from './chibuikeTypes';
import { chibuikeNewDoc, chibuikeCloneDoc, chibuikeTouch, chibuikeFindObject, chibuikeSelectionBounds, chibuikeObjectBounds, chibuikeReflowDoc } from './chibuikeDoc';
import { ChibuikeHistory } from './chibuikeHistory';
import { chibuikeId } from './chibuikeIds';
import { chibuikeAssets } from './chibuikeAssets';
import { chibuikeClamp, ChibuikeRect } from './chibuikeGeom';
import { ChibuikeJobs } from './chibuikeJobs';
import { chibuikeNeutralFilters } from './chibuikeTypes';

export type ChibuikeTool =
  | 'select' | 'hand' | 'crop'
  | 'text' | 'callout' | 'number' | 'badge'
  | 'rect' | 'ellipse' | 'line' | 'arrow' | 'pen' | 'highlighter'
  | 'blur' | 'spotlight' | 'magnify'
  | 'image' | 'mockup' | 'qr' | 'icon' | 'emoji';

export interface ChibuikeViewport { zoom: number; panX: number; panY: number; }
export interface ChibuikeToast { id: number; msg: string; kind: 'info' | 'ok' | 'warn' | 'error'; action?: { label: string; run: () => void }; }
export interface ChibuikeGridOverlay { enabled: boolean; spacing: number; opacity: number; color: string; majorEvery: number; }
export interface ChibuikePerf { dprCap: number; lowEnd: boolean; hud: boolean; }
export interface ChibuikeBrand { name: string; primary: string; accent: string; watermark: string; }

export interface ChibuikeDragXf { x: number; y: number; w: number; h: number; rotation: number; x2?: number; y2?: number; tailX?: number; tailY?: number; points?: { x: number; y: number }[]; }

const CHIBUIKE_SETTINGS_KEY = 'chibuike.settings.v1';
const CHIBUIKE_BRAND_KEY = 'chibuike.brand.v1';
const CHIBUIKE_SHORTCUTS_KEY = 'chibuike.shortcuts.v1';

class ChibuikeStore {
  history = new ChibuikeHistory(chibuikeNewDoc());
  jobs = new ChibuikeJobs();

  selection: string[] = [];
  tool: ChibuikeTool = 'select';
  editingTextId: string | null = null;
  cropActive = false;
  cropRect: ChibuikeRect | null = null;
  cropRatio: number | null = null;
  viewport: ChibuikeViewport = { zoom: 1, panX: 0, panY: 0 };
  canvasSize: { w: number; h: number } = { w: 800, h: 600 };
  uiMode: 'simple' | 'studio' = 'simple';
  rightTab: 'properties' | 'layers' | 'animate' = 'properties';
  marquee: ChibuikeRect | null = null;
  snapGuides: { v: number[]; h: number[] } = { v: [], h: [] };
  gridOverlay: ChibuikeGridOverlay = { enabled: false, spacing: 40, opacity: 0.14, color: '#7c5cff', majorEvery: 5 };
  perf: ChibuikePerf = { dprCap: 2, lowEnd: false, hud: false };
  playing = false;
  playhead = 0;
  animDuration = 3;
  modalOpen: null | 'palette' | 'export' | 'sizes' | 'shortcuts' | 'mockups' | 'sizes-multi' = null;
  numberCounter = 1;
  toasts: ChibuikeToast[] = [];
  brand: ChibuikeBrand = { name: '', primary: '#7c5cff', accent: '#22d3ee', watermark: '' };
  styleClipboard: Record<string, unknown> | null = null;
  objectClipboard: ChibuikeObject[] | null = null;
  online = true;
  lastSavedAt: number | null = null;
  dirty = false;
  /** has the viewport done its first fit-to-content? */
  userFitted = false;

  /** visual revision — bumped on ANY change the canvas should repaint */
  rev = 0;
  /** react revision — bumped only on committed/panel-visible changes */
  reactRev = 0;
  private listeners = new Set<() => void>();

  constructor() {
    this.history.onDirty = () => { this.dirty = true; };
    try {
      const s = localStorage.getItem(CHIBUIKE_SETTINGS_KEY);
      if (s) { Object.assign(this.perf, JSON.parse(s).perf ?? {}); Object.assign(this.gridOverlay, JSON.parse(s).gridOverlay ?? {}); }
      const b = localStorage.getItem(CHIBUIKE_BRAND_KEY);
      if (b) Object.assign(this.brand, JSON.parse(b));
    } catch { /* fresh start */ }
    if (typeof navigator !== 'undefined') {
      this.online = navigator.onLine;
      addEventListener('online', () => { this.online = true; this.bumpReact(); });
      addEventListener('offline', () => { this.online = false; this.bumpReact(); });
    }
  }

  /* ── subscriptions ── */
  subscribeReact = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  bumpReact() { this.reactRev++; for (const l of this.listeners) l(); }
  bumpRev() { this.rev++; }

  /* ── doc ── */
  get doc(): ChibuikeDoc { return this.history.liveDoc(); }

  /** Commit a change: begin → mutate → commit. Returns the doc to mutate. */
  transact<T>(label: string, fn: (doc: ChibuikeDoc) => T, opts?: { transient?: boolean }): T {
    if (opts?.transient) {
      // transient: mutate live doc, no history entry (drag frames call this)
      const r = fn(this.doc);
      this.touchDoc();
      return r;
    }
    this.history.begin(label);
    const r = fn(this.doc);
    chibuikeTouch(this.doc);
    this.history.commit();
    this.touchDoc();
    this.bumpReact();
    return r;
  }

  private touchDoc() {
    this.rev++;
    this.dirty = true;
  }

  /* ── selection ── */
  selected(): ChibuikeObject[] {
    const d = this.doc;
    return this.selection.map(id => chibuikeFindObject(d, id)).filter(Boolean) as ChibuikeObject[];
  }
  select(ids: string[], additive = false, subtractive = false): void {
    if (additive) this.selection = [...new Set([...this.selection, ...ids])];
    else if (subtractive) this.selection = this.selection.filter(id => !ids.includes(id));
    else this.selection = [...ids];
    this.bumpRev(); this.bumpReact();
  }
  selectAll() { this.select(this.doc.objects.filter(o => !o.locked).map(o => o.id)); }
  clearSelection() { if (this.selection.length) this.select([]); }

  /* ── object ops ── */
  addObjects(objs: ChibuikeObject[], label = 'Add'): void {
    this.transact(label, d => { d.objects.push(...objs); });
    this.select(objs.map(o => o.id));
  }
  deleteSelection(): void {
    if (!this.selection.length) return;
    this.transact('Delete', d => {
      const kill = new Set(this.selection);
      // group members die together
      for (const o of d.objects) if (o.groupId && kill.has(o.groupId)) kill.add(o.id);
      d.objects = d.objects.filter(o => !kill.has(o.id));
    });
    this.clearSelection();
  }
  duplicateSelection(): void {
    const sel = this.selected();
    if (!sel.length) return;
    const clones = sel.map(o => ({ ...(JSON.parse(JSON.stringify(o)) as ChibuikeObject), id: chibuikeId(o.kind.slice(0, 2)), x: o.x + 16, y: o.y + 16, groupId: null }));
    for (const c of clones) {
      if (c.kind === 'line' || c.kind === 'arrow') { c.x2 += 16; c.y2 += 16; }
      if (c.kind === 'callout') { c.tailX += 16; c.tailY += 16; }
      if (c.kind === 'pen') c.points = c.points.map(p => ({ x: p.x + 16, y: p.y + 16 }));
    }
    this.addObjects(clones, 'Duplicate');
  }
  groupSelection(): void {
    const sel = this.selected();
    if (sel.length < 2) return;
    const gid = chibuikeId('grp');
    this.transact('Group', d => { for (const o of d.objects) if (sel.some(s => s.id === o.id)) o.groupId = gid; });
  }
  ungroupSelection(): void {
    const sel = this.selected();
    this.transact('Ungroup', d => {
      const gids = new Set(sel.map(o => o.groupId).filter(Boolean) as string[]);
      for (const o of d.objects) if (o.groupId && gids.has(o.groupId)) o.groupId = null;
    });
  }
  toggleLock(ids?: string[]): void {
    const list = ids ?? this.selection;
    this.transact('Lock', d => {
      for (const o of d.objects) if (list.includes(o.id)) o.locked = !o.locked;
    });
  }
  toggleVisible(ids?: string[]): void {
    const list = ids ?? this.selection;
    this.transact('Visibility', d => {
      for (const o of d.objects) if (list.includes(o.id)) o.visible = !o.visible;
    });
  }
  reorder(mode: 'front' | 'back' | 'forward' | 'backward'): void {
    if (!this.selection.length) return;
    this.transact('Reorder', d => {
      const pick = new Set(this.selection);
      const chosen = d.objects.filter(o => pick.has(o.id));
      const rest = d.objects.filter(o => !pick.has(o.id));
      if (mode === 'front') d.objects = [...rest, ...chosen];
      else if (mode === 'back') d.objects = [...chosen, ...rest];
      else {
        const arr = [...d.objects];
        const step = mode === 'forward' ? 1 : -1;
        const indices = arr.map((o, i) => pick.has(o.id) ? i : -1).filter(i => i >= 0);
        const order = step === 1 ? indices.reverse() : indices;
        for (const i of order) {
          const j = i + step;
          if (j < 0 || j >= arr.length || pick.has(arr[j].id)) continue;
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        d.objects = arr;
      }
    });
  }
  moveLayerTo(fromId: string, toIndex: number): void {
    this.transact('Reorder layer', d => {
      const from = d.objects.findIndex(o => o.id === fromId);
      if (from < 0) return;
      const [obj] = d.objects.splice(from, 1);
      const idx = chibuikeClamp(toIndex > from ? toIndex - 1 : toIndex, 0, d.objects.length);
      d.objects.splice(idx, 0, obj);
    });
  }
  setProp(id: string, patch: Partial<ChibuikeObject>, label = 'Edit'): void {
    this.transact(label, d => {
      const o = chibuikeFindObject(d, id);
      if (o) Object.assign(o, patch);
    });
  }
  /** live (per-frame) prop write during drags */
  setPropLive(id: string, patch: Partial<ChibuikeObject>): void {
    const o = chibuikeFindObject(this.doc, id);
    if (o) Object.assign(o, patch);
    this.bumpRev();
  }
  nudge(dx: number, dy: number, big = false): void {
    if (!this.selection.length) return;
    const s = big ? 10 : 1;
    this.transact('Nudge', d => {
      for (const o of d.objects) {
        if (!this.selection.includes(o.id) || o.locked) continue;
        o.x += dx * s; o.y += dy * s;
        if (o.kind === 'line' || o.kind === 'arrow') { o.x2 += dx * s; o.y2 += dy * s; }
        if (o.kind === 'callout') { o.tailX += dx * s; o.tailY += dy * s; }
        if (o.kind === 'pen') o.points = o.points.map(p => ({ x: p.x + dx * s, y: p.y + dy * s }));
      }
    });
  }
  align(kind: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom'): void {
    const sel = this.selected();
    if (!sel.length) return;
    const multi = sel.length > 1;
    const bounds = chibuikeSelectionBounds(sel);
    if (!bounds) return;
    const frame: ChibuikeRect = multi ? bounds : { x: 0, y: 0, w: this.doc.width, h: this.doc.height };
    this.transact('Align', d => {
      for (const o of d.objects) {
        if (!this.selection.includes(o.id)) continue;
        const b = chibuikeObjectBounds(o);
        if (kind === 'left') o.x += frame.x - b.x;
        if (kind === 'right') o.x += frame.x + frame.w - (b.x + b.w);
        if (kind === 'hcenter') o.x += frame.x + frame.w / 2 - (b.x + b.w / 2);
        if (kind === 'top') o.y += frame.y - b.y;
        if (kind === 'bottom') o.y += frame.y + frame.h - (b.y + b.h);
        if (kind === 'vcenter') o.y += frame.y + frame.h / 2 - (b.y + b.h / 2);
        if (o.kind === 'callout') { /* keep tail relative */ o.tailX += 0; }
      }
    });
  }
  distribute(axis: 'h' | 'v'): void {
    const sel = this.selected().filter(o => !o.locked);
    if (sel.length < 3) return;
    const bounds = chibuikeSelectionBounds(sel)!;
    const sorted = [...sel].sort((a, b) => axis === 'h' ? a.x - b.x : a.y - b.y);
    const total = axis === 'h' ? bounds.w : bounds.h;
    const used = sorted.reduce((n, o) => n + (axis === 'h' ? o.w : o.h), 0);
    const gap = (total - used) / (sorted.length - 1);
    this.transact('Distribute', d => {
      let cur = axis === 'h' ? bounds.x : bounds.y;
      for (const o of sorted) {
        const live = chibuikeFindObject(d, o.id)!;
        if (axis === 'h') { live.x = cur; cur += live.w + gap; }
        else { live.y = cur; cur += live.h + gap; }
      }
    });
  }

  /* ── clipboard ── */
  copySelection(): void {
    const sel = this.selected();
    if (!sel.length) return;
    this.objectClipboard = JSON.parse(JSON.stringify(sel));
    this.toast(`Copied ${sel.length} object${sel.length > 1 ? 's' : ''}`, 'ok');
  }
  paste(offset = 16): void {
    if (!this.objectClipboard?.length) return;
    const clones = this.objectClipboard.map(o => ({ ...(JSON.parse(JSON.stringify(o)) as ChibuikeObject), id: chibuikeId(o.kind.slice(0, 2)), groupId: null }));
    for (const c of clones) {
      c.x += offset; c.y += offset;
      if (c.kind === 'line' || c.kind === 'arrow') { c.x2 += offset; c.y2 += offset; }
      if (c.kind === 'callout') { c.tailX += offset; c.tailY += offset; }
      if (c.kind === 'pen') c.points = c.points.map(p => ({ x: p.x + offset, y: p.y + offset }));
    }
    this.addObjects(clones, 'Paste');
  }
  copyStyle(): void {
    const [o] = this.selected();
    if (!o) return;
    const pick: Record<string, unknown> = { opacity: o.opacity, blend: o.blend };
    for (const k of ['fill', 'color', 'stroke', 'shadow', 'radius', 'filters', 'textColor', 'fontSize', 'weight', 'font'] as const) {
      if (k in o) pick[k] = JSON.parse(JSON.stringify((o as unknown as Record<string, unknown>)[k]));
    }
    this.styleClipboard = pick;
    this.toast('Style copied', 'ok');
  }
  pasteStyle(): void {
    const clip = this.styleClipboard;
    if (!clip) return;
    this.transact('Paste style', d => {
      for (const o of d.objects) {
        if (!this.selection.includes(o.id)) continue;
        for (const [k, v] of Object.entries(clip)) {
          if (k in o || k === 'fill' || k === 'color') (o as unknown as Record<string, unknown>)[k] = JSON.parse(JSON.stringify(v));
        }
      }
    });
  }

  /* ── viewport ── */
  zoomTo(z: number): void {
    this.viewport.zoom = chibuikeClamp(z, 0.02, 32);
    this.bumpRev(); this.bumpReact();
  }
  zoomBy(factor: number, cx?: number, cy?: number): void {
    const v = this.viewport;
    const old = v.zoom;
    this.zoomTo(old * factor);
    const k = v.zoom / old;
    if (cx !== undefined && cy !== undefined) {
      v.panX = cx - (cx - v.panX) * k;
      v.panY = cy - (cy - v.panY) * k;
      this.bumpRev();
    }
  }
  fit(): void {
    const d = this.doc;
    const pad = 48;
    const z = Math.min((this.canvasSize.w - pad * 2) / d.width, (this.canvasSize.h - pad * 2) / d.height);
    this.viewport.zoom = chibuikeClamp(z, 0.02, 4);
    this.viewport.panX = (this.canvasSize.w - d.width * this.viewport.zoom) / 2;
    this.viewport.panY = (this.canvasSize.h - d.height * this.viewport.zoom) / 2;
    this.bumpRev(); this.bumpReact();
  }
  docToScreen(x: number, y: number): { x: number; y: number } {
    return { x: x * this.viewport.zoom + this.viewport.panX, y: y * this.viewport.zoom + this.viewport.panY };
  }
  screenToDoc(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.viewport.panX) / this.viewport.zoom, y: (y - this.viewport.panY) / this.viewport.zoom };
  }

  /* ── ui ── */
  setTool(t: ChibuikeTool): void {
    this.tool = t;
    this.cropActive = false;
    this.cropRect = null;
    if (t !== 'select' && t !== 'hand') this.editingTextId = null;
    this.bumpRev(); this.bumpReact();
  }

  /** Enter crop mode for the selected image. */
  startCrop(): void {
    const [o] = this.selected();
    if (!o || o.kind !== 'image') { this.toast('Select an image to crop.', 'info'); return; }
    this.cropActive = true;
    this.cropRect = { x: o.x, y: o.y, w: o.w, h: o.h };
    this.cropRatio = null;
    this.bumpRev(); this.bumpReact();
  }
  cancelCrop(): void {
    this.cropActive = false;
    this.cropRect = null;
    this.bumpRev(); this.bumpReact();
  }
  /** Commit crop: object box becomes the crop, srcRect maps to source pixels. */
  applyCrop(): void {
    const o = this.selected()[0];
    const c = this.cropRect;
    if (!o || o.kind !== 'image' || !c) { this.cancelCrop(); return; }
    this.transact('Crop image', d => {
      const live = chibuikeFindObject(d, o.id)!;
      const img = live as ChibuikeObject & { kind: 'image' };
      const e = chibuikeAssets.get(img.assetId ?? '');
      const natW = e?.w ?? 1, natH = e?.h ?? 1;
      const base = img.srcRect ?? { sx: 0, sy: 0, sw: natW, sh: natH };
      const fx = base.sw / o.w, fy = base.sh / o.h;
      const sx = base.sx + (c.x - o.x) * fx;
      const sy = base.sy + (c.y - o.y) * fy;
      img.srcRect = { sx, sy, sw: c.w * fx, sh: c.h * fy };
      img.x = c.x; img.y = c.y; img.w = c.w; img.h = c.h;
    });
    this.cancelCrop();
  }
  resetCrop(): void {
    const o = this.selected()[0];
    if (!o || o.kind !== 'image') return;
    this.transact('Reset crop', d => {
      const img = chibuikeFindObject(d, o.id) as ChibuikeObject & { kind: 'image' };
      img.srcRect = null;
    });
    this.toast('Crop reset — original pixels restored.', 'ok');
  }
  setMode(m: 'simple' | 'studio'): void {
    this.uiMode = m;
    this.bumpReact();
  }
  setRightTab(t: 'properties' | 'layers' | 'animate'): void { this.rightTab = t; this.bumpReact(); }
  toast(msg: string, kind: ChibuikeToast['kind'] = 'info', action?: ChibuikeToast['action']): void {
    const id = Date.now() + Math.random();
    this.toasts = [...this.toasts, { id, msg, kind, action }];
    this.bumpReact();
    setTimeout(() => { this.toasts = this.toasts.filter(t => t.id !== id); this.bumpReact(); }, kind === 'error' ? 6500 : 3800);
  }
  setPerf(p: Partial<ChibuikePerf>): void {
    Object.assign(this.perf, p);
    try { localStorage.setItem(CHIBUIKE_SETTINGS_KEY, JSON.stringify({ perf: this.perf, gridOverlay: this.gridOverlay })); } catch { /* private mode */ }
    this.bumpRev(); this.bumpReact();
  }
  setGridOverlay(g: Partial<ChibuikeGridOverlay>): void {
    Object.assign(this.gridOverlay, g);
    try { localStorage.setItem(CHIBUIKE_SETTINGS_KEY, JSON.stringify({ perf: this.perf, gridOverlay: this.gridOverlay })); } catch { /* private mode */ }
    this.bumpRev(); this.bumpReact();
  }
  saveBrand(): void {
    try { localStorage.setItem(CHIBUIKE_BRAND_KEY, JSON.stringify(this.brand)); } catch { /* private mode */ }
    this.bumpReact();
  }

  /* ── animation playback ── */
  play(): void { this.playing = true; this.playhead = 0; this.bumpRev(); this.bumpReact(); }
  stop(): void { this.playing = false; this.playhead = 0; this.bumpRev(); this.bumpReact(); }
  seek(t: number): void { this.playhead = chibuikeClamp(t, 0, this.animDuration); this.bumpRev(); }

  /* ── images ── */
  async ingestImage(blob: Blob, name: string, opts?: { asBackground?: boolean }): Promise<string> {
    const id = chibuikeId('as');
    await chibuikeAssets.put(id, name, blob);
    const e = chibuikeAssets.get(id)!;
    const ref: ChibuikeAssetRef = {
      id, name, kind: 'image',
      src: blob.size < 1_500_000 ? await chibuikeAssets.toDataUrl(id) : null,
      w: e.w, h: e.h, bytes: blob.size, origin: 'local',
    };
    this.transact('Add image', d => { d.assets.push(ref); });
    return id;
  }

  placeImage(assetId: string, opts?: { center?: boolean }): void {
    const e = chibuikeAssets.get(assetId);
    if (!e) return;
    const d = this.doc;
    const first = d.objects.filter(o => o.kind === 'image' || o.kind === 'mockup').length === 0;
    let w = e.w, h = e.h;
    const maxW = d.width * 0.7, maxH = d.height * 0.7;
    const s = Math.min(maxW / w, maxH / h, 1);
    w *= s; h *= s;
    const x = (d.width - w) / 2, y = (d.height - h) / 2;
    const { chibuikeMakeImage } = chibuikeFactoriesLazy();
    const obj = chibuikeMakeImage(assetId, x, y, w, h);
    obj.name = 'Screenshot';
    this.addObjects([obj], 'Place image');
    if (first) this.transact('Resize canvas to image', dd => { dd.width = Math.round(e.w); dd.height = Math.round(e.h); });
    this.fit();
  }

  /* ── doc-wide ops ── */
  resizeCanvas(w: number, h: number, mode: 'scale' | 'raw'): void {
    if (mode === 'scale') {
      const next = chibuikeReflowDoc(this.doc, w, h, 'scale');
      this.transact('Canvas size', d => { Object.assign(d, next); });
    } else {
      this.transact('Canvas size', d => { d.width = w; d.height = h; });
    }
    this.fit();
  }
  applyBackground(bg: ChibuikeDoc['background']): void {
    this.transact('Background', d => { d.background = JSON.parse(JSON.stringify(bg)); });
  }
  loadDoc(doc: ChibuikeDoc, label: string): void {
    this.history.reset(chibuikeCloneDoc(doc));
    this.selection = [];
    this.tool = 'select';
    this.rev++; this.bumpReact();
    this.toast(label, 'ok');
  }

  setWatermark(w: ChibuikeDoc['watermark']): void {
    this.transact('Watermark', d => { d.watermark = w ? { ...w } : null; });
  }

  isTypingTarget(el: EventTarget | null): boolean {
    const t = el as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t.isContentEditable;
  }
}

/** avoids a circular import at module init (factories import types only) */
import { chibuikeMakeImage } from './chibuikeFactories';
function chibuikeFactoriesLazy() { return { chibuikeMakeImage }; }

export const store = new ChibuikeStore();

/* ── React hooks ── */
export function useChibuike(): number {
  return useSyncExternalStore(store.subscribeReact, () => store.reactRev);
}

/* ── persisted shortcut overrides ── */
export interface ChibuikeShortcutMap { [action: string]: string; }
export function chibuikeLoadShortcuts(): Partial<ChibuikeShortcutMap> {
  try { return JSON.parse(localStorage.getItem(CHIBUIKE_SHORTCUTS_KEY) ?? '{}'); } catch { return {}; }
}
export function chibuikeSaveShortcuts(map: Partial<ChibuikeShortcutMap>): void {
  try { localStorage.setItem(CHIBUIKE_SHORTCUTS_KEY, JSON.stringify(map)); } catch { /* private mode */ }
}

export { chibuikeNeutralFilters };
