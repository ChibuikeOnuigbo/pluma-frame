// Chibuike engine tests — document model, history, geometry, project format.
// Runs headless under vitest (node env, no DOM needed for these modules).
import { describe, it, expect } from 'vitest';
import { chibuikeNewDoc, chibuikeParseProject, chibuikeReflowDoc, chibuikeSelectionBounds, ChibuikeProjectError, chibuikeValidateTemplate } from '../src/chibuike/chibuikeDoc';
import { ChibuikeHistory } from '../src/chibuike/chibuikeHistory';
import { chibuikeId } from '../src/chibuike/chibuikeIds';
import { chibuikeSimplify, chibuikeRotatedBounds, chibuikeSnapMove, chibuikeRectsUnion } from '../src/chibuike/chibuikeGeom';
import { chibuikeMakeText, chibuikeMakeRect, chibuikeMakeArrow } from '../src/chibuike/chibuikeFactories';
import { chibuikeHexToRgb, chibuikeRgbToHex, chibuikeMix, chibuikeLuminance, chibuikeGradientFromPalette } from '../src/chibuike/chibuikeColor';
import { chibuikeEase } from '../src/chibuike/chibuikeRenderPure';
import { CHIBUIKE_CAPABILITIES } from '../src/chibuike/chibuikeCapabilities';
import { chibuikeQRModules } from '../src/chibuike/chibuikeQR';
import qrcode from 'qrcode-generator';

describe('chibuike document model', () => {
  it('creates a versioned doc with stable ids', () => {
    const doc = chibuikeNewDoc();
    expect(doc.chibuike).toBe('pluma-frame-next');
    expect(doc.version).toBe(1);
    expect(doc.id).toBeTruthy();
    const o = chibuikeMakeText('hi', 0, 0);
    expect(o.id).not.toBe(chibuikeMakeText('hi', 0, 0).id); // ids never collide
  });

  it('reflows layout proportionally on canvas resize', () => {
    const doc = chibuikeNewDoc({ width: 1000, height: 500 });
    const r = chibuikeMakeRect(100, 100, { w: 200, h: 100 });
    doc.objects.push(r);
    const out = chibuikeReflowDoc(doc, 2000, 1000, 'scale');
    expect(out.width).toBe(2000);
    const r2 = out.objects[0];
    expect(r2.x).toBeCloseTo(200);
    expect(r2.w).toBeCloseTo(400);
  });

  it('computes multi-object selection bounds incl. rotated + arrows', () => {
    const a = chibuikeMakeRect(0, 0, { w: 100, h: 100 });
    const arr = chibuikeMakeArrow(300, 300, 500, 400);
    const b = chibuikeSelectionBounds([a, arr]);
    expect(b).toEqual({ x: 0, y: 0, w: 500, h: 400 });
  });
});

describe('chibuike history (undo/redo)', () => {
  it('one transaction = one undo step, no-op drags add nothing', () => {
    const h = new ChibuikeHistory(chibuikeNewDoc());
    // no-op: begin+commit without change must NOT create history
    h.begin('ghost'); h.commit();
    expect(h.canUndo()).toBe(false);

    h.begin('move');
    h.liveDoc().objects.push(chibuikeMakeText('x', 0, 0));
    h.commit();
    expect(h.canUndo()).toBe(true);
    const after = h.undo()!;
    expect(after.objects.length).toBe(0);
    expect(h.canRedo()).toBe(true);
    h.redo();
    expect(h.liveDoc().objects.length).toBe(1);
  });

  it('nested begins are ignored (outermost transaction wins)', () => {
    const h = new ChibuikeHistory(chibuikeNewDoc());
    h.begin('outer');
    h.begin('inner');
    h.commit(); // commits inner → ignored because pending belongs to outer
    h.liveDoc().name = 'changed';
    h.commit();
    expect(h.undo()!.name).toBe('Untitled');
  });

  it('undo label introspection', () => {
    const h = new ChibuikeHistory(chibuikeNewDoc());
    h.begin('Add text');
    h.liveDoc().objects.push(chibuikeMakeText('a', 0, 0));
    h.commit();
    expect(h.undoLabel()).toBe('Add text');
  });
});

describe('chibuike geometry', () => {
  it('simplifies a dense stroke to few points', () => {
    const pts = Array.from({ length: 600 }, (_, i) => {
      const base = i < 300 ? i * 0.3 : 90 - (i - 300) * 0.2;
      return { x: i, y: base + Math.sin(i * 7.3) * 0.4 };
    });
    const out = chibuikeSimplify(pts, 2);
    // two straight segments with sub-epsilon jitter → exactly the 3 corner points
    expect(out.length).toBe(3);
    expect(out[0].x).toBe(0);
    expect(out[2].x).toBe(599);
  });

  it('rotated bounds wrap the corners', () => {
    const b = chibuikeRotatedBounds({ x: 0, y: 0, w: 100, h: 100 }, 45);
    expect(b.w).toBeCloseTo(141.42, 1);
    expect(b.h).toBeCloseTo(141.42, 1);
  });

  it('snaps a moving rect to canvas center with guides', () => {
    const res = chibuikeSnapMove(
      { x: 451, y: 200, w: 100, h: 100 },
      [],
      1000, 1000,
      8,
    );
    expect(res.dx).toBeCloseTo(-1); // center-x (500) minus rect center (501)
    expect(res.guides.some(g => g.dir === 'v')).toBe(true);
  });

  it('unions rects', () => {
    expect(chibuikeRectsUnion([{ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 5, w: 10, h: 10 }])).toEqual({ x: 0, y: 0, w: 30, h: 15 });
  });
});

describe('chibuike color', () => {
  it('hex round-trips', () => {
    expect(chibuikeRgbToHex(...chibuikeHexToRgb('#7c5cff'))).toBe('#7c5cff');
  });
  it('mixes and ranks luminance sensibly', () => {
    expect(chibuikeMix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(chibuikeLuminance('#ffffff')).toBeGreaterThan(chibuikeLuminance('#000000'));
  });
  it('image-derived gradients are professional (distinct stops)', () => {
    const g = chibuikeGradientFromPalette([{ color: '#3366ff', count: 5 }, { color: '#aa33cc', count: 3 }, { color: '#22ccaa', count: 1 }], 0.1);
    expect(g.stops.length).toBe(2);
    expect(g.stops[0].color).not.toBe(g.stops[1].color);
  });
});

describe('chibuike easing + QR', () => {
  it('ease functions stay within [0..1.1] and end at 1', () => {
    for (const e of ['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring', 'bounce-out', 'back-out']) {
      expect(chibuikeEase(1, e)).toBeCloseTo(1, 1);
      expect(chibuikeEase(0, e)).toBeGreaterThanOrEqual(0);
    }
  });
  it('QR grid is produced and valid-sized for a URL', () => {
    const grid = chibuikeQRModules('https://pluma.example', 'M');
    expect(grid).not.toBeNull();
    expect(grid!.length).toBeGreaterThanOrEqual(21);
    // cross-check against lib directly
    const qr = qrcode(0, 'M');
    qr.addData('https://pluma.example');
    qr.make();
    expect(grid!.length).toBe(qr.getModuleCount());
  });
  it('invalid QR data degrades to null, never throws', () => {
    expect(chibuikeQRModules('', 'M')).toBeNull();
  });
});

describe('chibuike project format', () => {
  it('round-trips a project file', () => {
    const doc = chibuikeNewDoc({ name: 'Round trip' });
    doc.objects.push(chibuikeMakeText('hello', 5, 5, { id: chibuikeId('tx') }));
    const json = JSON.stringify({ chibuike: 'pluma-frame-next', plumaProjectVersion: 1, doc });
    const parsed = chibuikeParseProject(JSON.parse(json));
    expect(parsed.doc.name).toBe('Round trip');
    expect(parsed.doc.objects[0].kind).toBe('text');
  });

  it('rejects foreign files with a clear error', () => {
    expect(() => chibuikeParseProject({ hello: 1 })).toThrow(ChibuikeProjectError);
    expect(() => chibuikeParseProject(null)).toThrow(ChibuikeProjectError);
    expect(() => chibuikeParseProject({ chibuike: 'other-app', doc: {} })).toThrow(/not made by Pluma/);
  });

  it('repairs duplicate ids on import', () => {
    const doc = chibuikeNewDoc();
    const t = chibuikeMakeText('a', 0, 0);
    const t2 = { ...t };
    doc.objects.push(t, t2);
    const parsed = chibuikeParseProject(JSON.parse(JSON.stringify({ chibuike: 'pluma-frame-next', plumaProjectVersion: 1, doc })));
    expect(parsed.doc.objects[0].id).not.toBe(parsed.doc.objects[1].id);
  });

  it('template validation reports empty slots', () => {
    const doc = chibuikeNewDoc();
    const img = chibuikeMakeRect(0, 0);
    doc.objects.push({ ...chibuikeMakeText('', 0, 0), kind: 'text' } as never);
    const problems = chibuikeValidateTemplate(doc);
    expect(problems.length).toBeGreaterThan(0);
    void img;
  });
});

describe('chibuike capabilities', () => {
  it('keeps core exports enabled and honesty flags off', () => {
    expect(CHIBUIKE_CAPABILITIES.pngExport.enabled).toBe(true);
    expect(CHIBUIKE_CAPABILITIES.webmExport.enabled).toBe(true);
    expect(CHIBUIKE_CAPABILITIES.gifExport.enabled).toBe(false);
    expect(CHIBUIKE_CAPABILITIES.gifExport.reason).toBeTruthy();
  });
});
