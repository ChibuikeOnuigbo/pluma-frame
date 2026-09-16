// Chibuike document factory + pure doc operations.
// All mutations flow through the store's transaction API; these helpers just
// build and transform immutable-ish snapshots.

import {
  ChibuikeDoc, ChibuikeObject, ChibuikeProjectFile, ChibuikeAssetRef,
  CHIBUIKE_PROJECT_KIND, CHIBUIKE_DOC_VERSION, chibuikeNeutralFilters,
} from './chibuikeTypes';
import { chibuikeId } from './chibuikeIds';
import { chibuikeRotatedBounds, ChibuikeRect } from './chibuikeGeom';

export function chibuikeNewDoc(partial?: Partial<ChibuikeDoc>): ChibuikeDoc {
  const now = new Date().toISOString();
  return {
    chibuike: CHIBUIKE_PROJECT_KIND,
    version: CHIBUIKE_DOC_VERSION,
    id: chibuikeId('doc'),
    name: 'Untitled',
    width: 1600,
    height: 900,
    background: { type: 'linear', angle: 120, stops: [{ o: 0, color: '#eef1f9' }, { o: 1, color: '#d8def0' }] },
    objects: [],
    watermark: null,
    guides: { snap: true },
    exportSettings: { format: 'png', scale: 2, quality: 0.92, transparent: false },
    templateId: null,
    meta: { createdAt: now, updatedAt: now },
    assets: [],
    ...partial,
  };
}

export function chibuikeCloneDoc(doc: ChibuikeDoc): ChibuikeDoc {
  return JSON.parse(JSON.stringify(doc)) as ChibuikeDoc;
}

export function chibuikeTouch(doc: ChibuikeDoc): ChibuikeDoc {
  doc.meta.updatedAt = new Date().toISOString();
  return doc;
}

export function chibuikeObjectBounds(o: ChibuikeObject): ChibuikeRect {
  if (o.kind === 'line' || o.kind === 'arrow') {
    const x = Math.min(o.x, o.x2), y = Math.min(o.y, o.y2);
    return { x, y, w: Math.abs(o.x2 - o.x) || 1, h: Math.abs(o.y2 - o.y) || 1 };
  }
  if (o.kind === 'callout') {
    // tail may stick out; include it
    const r = { x: o.x, y: o.y, w: o.w, h: o.h };
    const tx = o.tailX, ty = o.tailY;
    const x0 = Math.min(r.x, tx), y0 = Math.min(r.y, ty);
    const x1 = Math.max(r.x + r.w, tx), y1 = Math.max(r.y + r.h, ty);
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  return { x: o.x, y: o.y, w: o.w, h: o.h };
}

export function chibuikeSelectionBounds(objs: ChibuikeObject[]): ChibuikeRect | null {
  if (!objs.length) return null;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const o of objs) {
    const b = chibuikeRotatedBounds(chibuikeObjectBounds(o), o.rotation);
    x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function chibuikeFindObject(doc: ChibuikeDoc, id: string): ChibuikeObject | undefined {
  return doc.objects.find(o => o.id === id);
}

/** Scale the whole composition to a new canvas size, preserving relative layout.
 *  Used by social-size presets, auto-resize and multi-size export. */
export function chibuikeReflowDoc(doc: ChibuikeDoc, w: number, h: number, mode: 'scale' | 'fit' = 'scale'): ChibuikeDoc {
  const next = chibuikeCloneDoc(doc);
  const sx = w / doc.width, sy = h / doc.height;
  const s = mode === 'scale' ? Math.min(sx, sy) : Math.min(sx, sy);
  const ox = (w - doc.width * s) / 2, oy = (h - doc.height * s) / 2;
  next.width = w; next.height = h;
  next.background = JSON.parse(JSON.stringify(doc.background));
  next.objects = doc.objects.map(o => {
    const c = JSON.parse(JSON.stringify(o)) as ChibuikeObject;
    c.x = c.x * s + ox; c.y = c.y * s + oy;
    if (c.kind === 'line' || c.kind === 'arrow') { c.x2 = c.x2 * s + ox; c.y2 = c.y2 * s + oy; }
    if (c.kind === 'callout') { c.tailX = c.tailX * s + ox; c.tailY = c.tailY * s + oy; }
    if (c.kind === 'pen') c.points = c.points.map(p => ({ x: p.x * s + ox, y: p.y * s + oy }));
    c.w *= s; c.h *= s;
    if ('size' in c && typeof c.size === 'number') c.size *= s;
    if (c.kind === 'text') { c.size *= s; c.letterSpacing *= s; }
    if (c.kind === 'callout') c.fontSize *= s;
    if (c.kind === 'number') c.fontSize *= s;
    return c;
  });
  chibuikeTouch(next);
  return next;
}

/* ── Project file validation / migration ─────────────────────────────────── */

export class ChibuikeProjectError extends Error {}

export function chibuikeParseProject(json: unknown): ChibuikeProjectFile {
  if (!json || typeof json !== 'object') throw new ChibuikeProjectError('Not a Pluma project (no JSON object).');
  const j = json as Record<string, unknown>;
  if (j.chibuike !== CHIBUIKE_PROJECT_KIND) throw new ChibuikeProjectError('This file was not made by Pluma Frame Next.');
  const v = Number(j.plumaProjectVersion ?? (j.doc as ChibuikeDoc | undefined)?.version ?? 0);
  if (!Number.isFinite(v) || v < 0 || v > CHIBUIKE_DOC_VERSION) {
    throw new ChibuikeProjectError(`Unsupported project version ${v}. This build reads v0..v${CHIBUIKE_DOC_VERSION}.`);
  }
  const doc = j.doc as ChibuikeDoc | undefined;
  if (!doc || !Array.isArray(doc.objects)) throw new ChibuikeProjectError('Project is missing its object list.');
  if (v < CHIBUIKE_DOC_VERSION) {
    // future migrations live here; today v0/v1 share a shape
    doc.version = CHIBUIKE_DOC_VERSION;
  }
  if (!doc.guides) doc.guides = { snap: true };
  if (!doc.exportSettings) doc.exportSettings = { format: 'png', scale: 2, quality: 0.92, transparent: false };
  if (!Array.isArray(doc.assets)) doc.assets = [];
  const ids = new Set<string>();
  for (const o of doc.objects) {
    if (!o || typeof o.id !== 'string' || !o.kind) throw new ChibuikeProjectError('Malformed object inside project.');
    if (ids.has(o.id)) o.id = chibuikeId(o.kind);
    ids.add(o.id);
  }
  const blobs = (j.assetBlobs ?? undefined) as Record<string, string> | undefined;
  return { chibuike: CHIBUIKE_PROJECT_KIND, plumaProjectVersion: CHIBUIKE_DOC_VERSION, doc, assetBlobs: blobs };
}

/** Template validation — never silently render something broken. */
export function chibuikeValidateTemplate(doc: ChibuikeDoc): string[] {
  const problems: string[] = [];
  for (const o of doc.objects) {
    if ((o.kind === 'image' || o.kind === 'mockup' || o.kind === 'magnify') && 'assetId' in o) {
      const ref = o.assetId ? doc.assets.find(a => a.id === o.assetId) : null;
      if (!o.assetId || !ref) problems.push(`“${o.name}” has an empty image slot.`);
      else if (!ref.src && ref.origin === 'remote') problems.push(`“${o.name}” needs a remote image that is not bundled.`);
    }
    if (o.kind === 'qr' && !o.data) problems.push(`“${o.name}” has an empty QR target.`);
    if (o.kind === 'text' && !o.text.trim()) problems.push(`“${o.name}” has empty text.`);
  }
  return problems;
}

export function chibuikeAssetRefFromDataUrl(id: string, name: string, src: string, w: number, h: number, bytes: number, embedded: boolean): ChibuikeAssetRef {
  return { id, name, kind: 'image', src: embedded ? src : null, w, h, bytes, origin: embedded ? 'embedded' : 'local' };
}
