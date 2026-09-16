/**
 * Chibuike painter — deterministic scene rasterizer.
 * Order: background → objects (z = array order) → watermark.
 * The SAME painter renders editor canvas, template thumbnails, export
 * bitmaps and animation frames — one truth, no preview/export drift.
 * Handcrafted by Chibuike.
 */
import {
  ChibuikeDoc, ChibuikeObject, ChibuikeShadow, ChibuikeFilters, chibuikeNeutralFilters,
} from './chibuikeTypes';
import { chibuikeWithAlpha, chibuikeReadOn } from './chibuikeColor';
import { chibuikeAssets } from './chibuikeAssets';
import { chibuikeFontCss, chibuikeFontStack, chibuikeWrapText, chibuikeMeasureLine, chibuikeFitSize } from './chibuikeText';
import { chibuikeDrawWarped, chibuikeTiltQuad, chibuikeHasTilt, ChibuikeTilt } from './chibuikeWarp';
import { chibuikeQRModules } from './chibuikeQR';

/* ── shared helpers ─────────────────────────────────────────────────────── */

export function chibuikeShadowCss(s: ChibuikeShadow): string {
  return `${s.x}px ${s.y}px ${s.blur}px ${s.spread}px ${chibuikeWithAlpha(s.color, s.opacity)}`;
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function applyShadow(ctx: CanvasRenderingContext2D, s: ChibuikeShadow | null | undefined, quality = 1): void {
  if (!s) { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; return; }
  ctx.shadowColor = chibuikeWithAlpha(s.color, s.opacity);
  ctx.shadowBlur = s.blur * quality;
  ctx.shadowOffsetX = s.x;
  ctx.shadowOffsetY = s.y;
}

function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
}

function filterCss(f: ChibuikeFilters | undefined): string {
  if (!f) return 'none';
  const parts: string[] = [];
  if (f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
  if (f.contrast !== 1) parts.push(`contrast(${f.contrast})`);
  if (f.saturate !== 1) parts.push(`saturate(${f.saturate})`);
  if (f.grayscale) parts.push(`grayscale(${f.grayscale})`);
  if (f.sepia) parts.push(`sepia(${f.sepia})`);
  if (f.hueRotate) parts.push(`hue-rotate(${f.hueRotate}deg)`);
  if (f.blur) parts.push(`blur(${f.blur}px)`);
  return parts.length ? parts.join(' ') : 'none';
}

/** Fill style resolvers for background gradients. */
export function chibuikePaintBackground(ctx: CanvasRenderingContext2D, doc: ChibuikeDoc, opts?: { transparentOverride?: boolean }): void {
  const { width: W, height: H } = doc;
  const bg = opts?.transparentOverride ? ({ type: 'transparent' } as const) : doc.background;
  switch (bg.type) {
    case 'transparent': return;
    case 'solid': ctx.fillStyle = bg.color; ctx.fillRect(0, 0, W, H); return;
    case 'linear': {
      const a = (bg.angle * Math.PI) / 180;
      const cx = W / 2, cy = H / 2;
      const len = Math.abs(W * Math.cos(a)) + Math.abs(H * Math.sin(a));
      const g = ctx.createLinearGradient(cx - (Math.cos(a) * len) / 2, cy - (Math.sin(a) * len) / 2, cx + (Math.cos(a) * len) / 2, cy + (Math.sin(a) * len) / 2);
      for (const s of bg.stops) g.addColorStop(Math.max(0, Math.min(1, s.o)), s.color);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return;
    }
    case 'radial': {
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.hypot(W, H) / 2);
      for (const s of bg.stops) g.addColorStop(Math.max(0, Math.min(1, s.o)), s.color);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); return;
    }
    case 'mesh': {
      ctx.fillStyle = bg.base; ctx.fillRect(0, 0, W, H);
      const soft = bg.softness ?? 1;
      ctx.save();
      for (const p of bg.points) {
        const px = p.x * W, py = p.y * H, pr = p.r * Math.max(W, H) * soft;
        const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, chibuikeWithAlpha(p.color, 0.95));
        g.addColorStop(1, chibuikeWithAlpha(p.color, 0));
        ctx.fillStyle = g;
        ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      }
      ctx.restore(); return;
    }
    case 'pattern': {
      ctx.fillStyle = bg.base; ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalAlpha = bg.opacity;
      ctx.fillStyle = bg.color;
      ctx.strokeStyle = bg.color;
      const s = bg.scale;
      if (bg.kind === 'dots') {
        for (let y = s; y < H; y += s) for (let x = s; x < W; x += s) {
          ctx.beginPath(); ctx.arc(x, y, Math.max(1, s * 0.09), 0, Math.PI * 2); ctx.fill();
        }
      } else if (bg.kind === 'grid') {
        ctx.lineWidth = Math.max(1, s * 0.03);
        for (let x = 0; x <= W; x += s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      } else if (bg.kind === 'cross') {
        ctx.lineWidth = Math.max(1, s * 0.03);
        for (let y = s; y < H; y += s) for (let x = s; x < W; x += s) {
          ctx.beginPath(); ctx.moveTo(x - s * 0.1, y); ctx.lineTo(x + s * 0.1, y);
          ctx.moveTo(x, y - s * 0.1); ctx.lineTo(x, y + s * 0.1); ctx.stroke();
        }
      } else if (bg.kind === 'diag') {
        ctx.lineWidth = Math.max(1, s * 0.08);
        for (let x = -H; x < W + H; x += s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); }
      } else if (bg.kind === 'noise') {
        // deterministic noise — seeded, so export matches preview exactly
        let seed = 7;
        const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
        for (let i = 0; i < (W * H) / (s * s * 6); i++) {
          ctx.globalAlpha = bg.opacity * rnd() * 0.5;
          ctx.fillRect(rnd() * W, rnd() * H, Math.max(1, s * 0.06), Math.max(1, s * 0.06));
        }
      }
      ctx.restore(); return;
    }
    case 'image': {
      if (!bg.assetId) { ctx.fillStyle = '#e5e8f0'; ctx.fillRect(0, 0, W, H); return; }
      const { src, w, h } = chibuikeAssets.paintSource(bg.assetId, W);
      if (!src) { ctx.fillStyle = '#e5e8f0'; ctx.fillRect(0, 0, W, H); return; }
      ctx.save();
      // big blur radii sample the small preview — cheap and visually identical
      if (bg.blur > 0) {
        const preview = chibuikeAssets.paintSource(bg.assetId, 640);
        const psrc = preview.src ?? src;
        const pw = preview.w && preview.src ? preview.w : w, ph = preview.h && preview.src ? preview.h : h;
        ctx.filter = `blur(${bg.blur}px)`;
        const k = Math.max(W / pw, H / ph);
        const dw = pw * k, dh = ph * k;
        ctx.drawImage(psrc as CanvasImageSource, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        const k = Math.max(W / w, H / h);
        const dw = w * k, dh = h * k;
        ctx.drawImage(src as CanvasImageSource, (W - dw) / 2, (H - dh) / 2, dw, dh);
      }
      ctx.filter = 'none';
      if (bg.overlay) {
        ctx.fillStyle = chibuikeWithAlpha(bg.overlay.color, bg.overlay.opacity);
        ctx.fillRect(0, 0, W, H);
      }
      ctx.restore(); return;
    }
  }
}

/* ── screen/region scratch canvases (blur, spotlight, magnify) ──────────── */
const scratchCache: { a?: HTMLCanvasElement; b?: HTMLCanvasElement } = {};
function scratch(which: 'a' | 'b', w: number, h: number): HTMLCanvasElement {
  const c = scratchCache[which] ?? (scratchCache[which] = document.createElement('canvas'));
  if (c.width !== w || c.height !== h) { c.width = Math.max(1, w); c.height = Math.max(1, h); }
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, c.width, c.height);
  return c;
}

function regionPath(ctx: CanvasRenderingContext2D, o: { shape: 'rect' | 'ellipse'; x: number; y: number; w: number; h: number; radius?: number }): void {
  ctx.beginPath();
  if (o.shape === 'ellipse') ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
  else roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius ?? 0);
}

/* ── the object painter ─────────────────────────────────────────────────── */
export function chibuikePaintObject(
  ctx: CanvasRenderingContext2D,
  doc: ChibuikeDoc,
  o: ChibuikeObject,
  env: { quality?: number; lowEnd?: boolean } = {},
): void {
  const quality = env.quality ?? 1;
  ctx.save();
  ctx.globalAlpha = o.opacity;
  ctx.globalCompositeOperation = o.blend === 'normal' ? 'source-over' : (o.blend as GlobalCompositeOperation);

  switch (o.kind) {
    case 'image': chibuikePaintImage(ctx, o, quality, env.lowEnd); break;
    case 'mockup': chibuikePaintMockup(ctx, o, quality, env.lowEnd); break;
    case 'text': chibuikePaintText(ctx, o); break;
    case 'rect': case 'ellipse': chibuikePaintShape(ctx, o, quality); break;
    case 'line': {
      ctx.strokeStyle = o.color; ctx.lineWidth = o.width; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(o.x2, o.y2); ctx.stroke(); break;
    }
    case 'arrow': chibuikePaintArrow(ctx, o); break;
    case 'pen': chibuikePaintPen(ctx, o); break;
    case 'blur': chibuikePaintRedact(ctx, doc, o); break;
    case 'spotlight': chibuikePaintSpotlight(ctx, doc, o); break;
    case 'number': chibuikePaintNumber(ctx, o, quality); break;
    case 'callout': chibuikePaintCallout(ctx, o, quality); break;
    case 'qr': chibuikePaintQr(ctx, o); break;
    case 'icon': chibuikePaintIcon(ctx, o); break;
    case 'magnify': chibuikePaintMagnify(ctx, o, quality); break;
    case 'badge': chibuikePaintBadge(ctx, o, quality); break;
  }
  ctx.restore();
}

/* ── images + tilt + crop ───────────────────────────────────────────────── */
function imageRegion(o: { srcRect: { sx: number; sy: number; sw: number; sh: number } | null; }): { sx: number; sy: number; sw: number; sh: number } | null {
  return o.srcRect;
}

export function chibuikeResolveAssetRegion(assetId: string | null, srcRect: { sx: number; sy: number; sw: number; sh: number } | null, dispW: number): { src: CanvasImageSource | null; sx: number; sy: number; sw: number; sh: number; natW: number; natH: number } {
  if (!assetId) return { src: null, sx: 0, sy: 0, sw: 0, sh: 0, natW: 0, natH: 0 };
  const { src, w, h } = chibuikeAssets.paintSource(assetId, dispW);
  if (!src) return { src: null, sx: 0, sy: 0, sw: 0, sh: 0, natW: 0, natH: 0 };
  const r = srcRect ?? { sx: 0, sy: 0, sw: w, sh: h };
  return { src, ...r, natW: w, natH: h };
}

export function chibuikePaintImage(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'image' }>, quality: number, lowEnd?: boolean): void {
  const reg = chibuikeResolveAssetRegion(o.assetId, o.srcRect, o.w);
  if (!reg.src) {
    // missing asset → honest checkerboard, never a broken layout
    ctx.fillStyle = '#c9ced9'; roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill();
    ctx.fillStyle = '#dde1ea'; for (let yy = 0; yy < 4; yy++) for (let xx = 0; xx < 4; xx++) if ((xx + yy) % 2 === 0) ctx.fillRect(o.x + (xx * o.w) / 4, o.y + (yy * o.h) / 4, o.w / 4, o.h / 4);
    return;
  }
  const tilt = o.tilt && (o.tilt.rx || o.tilt.ry) ? o.tilt : null;
  ctx.save();
  if (o.rotation) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    ctx.translate(cx, cy); ctx.rotate((o.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
  }
  // shadow painted from the silhouette so tilt keeps its grounding
  if (o.shadow) {
    ctx.save();
    const quad = tilt ? chibuikeTiltQuad(tilt, o.x, o.y, o.w, o.h) : null;
    applyShadow(ctx, o.shadow, lowEnd ? 0.5 : 1);
    ctx.fillStyle = 'rgba(0,0,0,1)';
    if (quad) {
      ctx.beginPath(); ctx.moveTo(quad[0].x, quad[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(quad[i].x, quad[i].y);
      ctx.closePath(); ctx.fill();
    } else {
      roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill();
    }
    ctx.restore();
  }
  if (o.border) {
    ctx.save();
    ctx.strokeStyle = o.border.color; ctx.lineWidth = o.border.width * 2;
    roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.stroke();
    ctx.restore();
  }
  const reg2 = { ...reg, src: reg.src as CanvasImageSource };
  ctx.save();
  roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius);
  ctx.clip();
  ctx.filter = filterCss(o.filters);
  const flip = (o.flipX ? -1 : 1);
  ctx.translate(o.x + (flip < 0 ? o.w : 0), o.y);
  ctx.scale(flip, o.flipY ? -1 : 1);
  if (tilt) {
    // render crop to scratch at target size, then warp into place
    const scratchC = scratch('a', Math.round(o.w), Math.round(o.h));
    const sctx = scratchC.getContext('2d')!;
    sctx.clearRect(0, 0, scratchC.width, scratchC.height);
    drawFitted(sctx, reg2, 0, 0, o.w, o.h, o.fit);
    chibuikeDrawWarped(ctx, scratchC, scratchC.width, scratchC.height, o.x, o.y, o.w, o.h, tilt);
  } else {
    drawFitted(ctx, reg2, o.x, o.y, o.w, o.h, o.fit);
  }
  ctx.filter = 'none';
  ctx.restore();
  ctx.restore();
}

/** cover/contain/fill blit of a (possibly cropped) region into a box. */
function drawFitted(ctx: CanvasRenderingContext2D, reg: { src: CanvasImageSource; sx: number; sy: number; sw: number; sh: number }, x: number, y: number, w: number, h: number, fit: 'cover' | 'contain' | 'fill'): void {
  const arBox = w / h, arSrc = reg.sw / reg.sh;
  let sx = reg.sx, sy = reg.sy, sw = reg.sw, sh = reg.sh;
  let dx = x, dy = y, dw = w, dh = h;
  if (fit === 'cover') {
    if (arSrc > arBox) { const nw = sh * arBox; sx += (sw - nw) / 2; sw = nw; }
    else { const nh = sw / arBox; sy += (sh - nh) / 2; sh = nh; }
  } else if (fit === 'contain') {
    if (arSrc > arBox) { dh = w / arSrc; dy += (h - dh) / 2; }
    else { dw = h * arSrc; dx += (w - dw) / 2; }
  }
  ctx.drawImage(reg.src, sx, sy, sw, sh, dx, dy, dw, dh);
}

/* ── mockups (procedural chrome — original artwork, no third-party assets) ─ */
export function chibuikeMockupScreen(device: string, w: number, h: number): { x: number; y: number; w: number; h: number; radius: number } {
  switch (device) {
    case 'browser': case 'browser-dark': return { x: 0, y: Math.min(44, h * 0.09), w, h: h - Math.min(44, h * 0.09), radius: 0 };
    case 'mac': return { x: w * 0.02, y: h * 0.05, w: w * 0.96, h: h * 0.86, radius: 6 };
    case 'phone': return { x: w * 0.055, y: h * 0.035, w: w * 0.89, h: h * 0.93, radius: 24 };
    case 'laptop': return { x: w * 0.09, y: h * 0.04, w: w * 0.82, h: h * 0.78, radius: 8 };
    default: return { x: 0, y: 0, w, h, radius: 0 };
  }
}

function chibuikePaintMockup(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'mockup' }>, quality: number, lowEnd?: boolean): void {
  const dark = o.device === 'browser-dark';
  const tilt = o.tilt && (o.tilt.rx || o.tilt.ry) ? o.tilt : null;
  ctx.save();
  if (o.rotation) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    ctx.translate(cx, cy); ctx.rotate((o.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
  }
  if (o.shadow) { applyShadow(ctx, o.shadow, lowEnd ? 0.5 : 1); ctx.fillStyle = '#000'; roundRectPath(ctx, o.x, o.y, o.w, o.h, 14); ctx.fill(); clearShadow(ctx); }

  const body = dark ? '#1f2330' : '#e8ebf2';
  const bar = dark ? '#2a2f3e' : '#dfe3ec';
  const border = dark ? '#3a4152' : '#cdd3e0';

  if (o.device === 'laptop') {
    // base deck
    ctx.fillStyle = dark ? '#2a2f3e' : '#d3d8e4';
    roundRectPath(ctx, o.x + o.w * 0.04, o.y + o.h * 0.82, o.w * 0.92, o.h * 0.06, 8); ctx.fill();
    ctx.fillStyle = dark ? '#3a4152' : '#b9c0d2';
    roundRectPath(ctx, o.x + o.w * 0.38, o.y + o.h * 0.82, o.w * 0.24, o.h * 0.022, 6); ctx.fill();
  }

  const screen = chibuikeMockupScreen(o.device, o.w, o.h);
  const sx = o.x + screen.x, sy = o.y + screen.y, sw = screen.w, sh = screen.h;

  // device body
  ctx.fillStyle = o.device === 'phone' ? '#14161d' : body;
  const bodyR = o.device === 'phone' ? 30 : o.device === 'laptop' ? 12 : 12;
  roundRectPath(ctx, o.x, o.y, o.w, o.device === 'laptop' ? o.h * 0.84 : o.h, bodyR); ctx.fill();

  // screen clip + content
  ctx.save();
  roundRectPath(ctx, sx, sy, sw, sh, screen.radius);
  ctx.clip();
  const reg = chibuikeResolveAssetRegion(o.assetId, null, sw);
  if (reg.src) {
    drawFitted(ctx, { src: reg.src as CanvasImageSource, sx: reg.sx, sy: reg.sy, sw: reg.sw, sh: reg.sh }, sx, sy, sw, sh, o.fit);
  } else {
    ctx.fillStyle = dark ? '#12141c' : '#f4f6fb';
    ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = dark ? '#3a4152' : '#c3cad8';
    ctx.font = `500 ${Math.max(12, sw * 0.035)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Drop an image into this screen', sx + sw / 2, sy + sh / 2);
  }
  ctx.restore();

  // chrome details
  if (o.device === 'browser' || o.device === 'browser-dark') {
    const barH = screen.y;
    ctx.fillStyle = bar;
    roundRectPath(ctx, o.x, o.y, o.w, barH + 8, { tl: 12, tr: 12, bl: 0, br: 0 } as unknown as number); ctx.fill();
    // traffic lights — three dots, universal visual shorthand
    const dotR = Math.max(2.5, barH * 0.11);
    const dotY = o.y + barH / 2 + 4;
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(o.x + 18 + i * (dotR * 3), dotY, dotR, 0, Math.PI * 2); ctx.fill();
    });
    // address pill
    const pillX = o.x + 18 + dotR * 9, pillW = Math.min(o.w - (pillX - o.x) - 12, o.w * 0.55);
    ctx.fillStyle = dark ? '#171a24' : '#f2f4f9';
    roundRectPath(ctx, pillX, dotY - dotR * 1.6, pillW, dotR * 3.2, dotR * 1.6); ctx.fill();
    if (o.urlText) {
      ctx.fillStyle = dark ? '#8b93a7' : '#5a6478';
      ctx.font = `400 ${Math.max(9, barH * 0.34)}px sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(o.urlText, pillX + dotR * 1.4, dotY + 1);
      ctx.textBaseline = 'alphabetic';
    }
  } else if (o.device === 'mac') {
    ctx.fillStyle = bar;
    roundRectPath(ctx, sx, sy, sw, Math.min(26, sh * 0.06), { } as never); ctx.fill();
    const dotR = Math.max(2, sh * 0.012);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(sx + 14 + i * dotR * 3, sy + Math.min(13, sh * 0.03), dotR, 0, Math.PI * 2); ctx.fill();
    });
  } else if (o.device === 'phone') {
    // notch
    ctx.fillStyle = '#14161d';
    roundRectPath(ctx, o.x + o.w * 0.32, o.y + o.h * 0.014, o.w * 0.36, o.h * 0.026, 10); ctx.fill();
  }
  if (o.radius && o.device !== 'phone') { /* radius applied via body roundRect already */ }
  ctx.restore();
}

/* ── text ───────────────────────────────────────────────────────────────── */
export function chibuikeTextLayout(o: Extract<ChibuikeObject, { kind: 'text' }>): { lines: string[]; lineHeight: number; size: number; padX: number; padY: number } {
  const probe = document.createElement('canvas').getContext('2d')!;
  const style = { font: o.font, size: o.size, weight: o.weight, letterSpacing: o.letterSpacing, lineHeight: o.lineHeight };
  let size = o.size;
  const content = o.transform === 'upper' ? o.text.toUpperCase() : o.transform === 'lower' ? o.text.toLowerCase() : o.text;
  if (o.autoFit && o.w > 0) size = chibuikeFitSize(probe, content, style, o.w - (o.bg ? o.bg.padX * 2 : 0));
  const lines = chibuikeWrapText(probe, content, { ...style, size }, Math.max(20, o.w - (o.bg ? o.bg.padX * 2 : 0)));
  return { lines, lineHeight: size * o.lineHeight, size, padX: o.bg?.padX ?? 0, padY: o.bg?.padY ?? 0 };
}

function chibuikePaintText(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'text' }>): void {
  const lay = chibuikeTextLayout(o);
  const padX = lay.padX, padY = lay.padY;
  const boxW = o.w, boxH = lay.lines.length * lay.lineHeight + padY * 2;
  ctx.save();
  if (o.rotation) {
    const cx = o.x + o.w / 2, cy = o.y + boxH / 2;
    ctx.translate(cx, cy); ctx.rotate((o.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
  }
  if (o.bg) {
    if (o.bg.radius >= Math.min(boxW, boxH) / 2 - 1 && boxH <= 80) { /* pill */ }
    ctx.fillStyle = o.bg.color;
    roundRectPath(ctx, o.x, o.y, boxW, boxH, o.bg.radius); ctx.fill();
  }
  ctx.font = `${o.weight} ${lay.size}px ${chibuikeFontStack(o.font)}`;
  const anyCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if (o.letterSpacing) anyCtx.letterSpacing = `${o.letterSpacing}px`;
  ctx.textBaseline = 'top';
  if (o.shadow) applyShadow(ctx, o.shadow, 1);
  let y = o.y + padY;
  for (const line of lay.lines) {
    const lw = chibuikeMeasureLine(ctx, line, { font: o.font, size: lay.size, weight: o.weight, letterSpacing: o.letterSpacing, lineHeight: o.lineHeight });
    const x = o.align === 'center' ? o.x + (boxW - lw) / 2 : o.align === 'right' ? o.x + boxW - lw : o.x;
    if (o.stroke && o.stroke.width > 0) {
      ctx.strokeStyle = o.stroke.color; ctx.lineWidth = o.stroke.width; ctx.lineJoin = 'round';
      ctx.strokeText(line, x + padX, y + padY);
    }
    ctx.fillStyle = o.color;
    ctx.fillText(line, x + padX, y + padY);
    y += lay.lineHeight;
  }
  if (o.letterSpacing) anyCtx.letterSpacing = '0px';
  ctx.restore();
}

/* ── shapes ─────────────────────────────────────────────────────────────── */
function chibuikePaintShape(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'rect' } | { kind: 'ellipse' }>, quality: number): void {
  ctx.save();
  if (o.rotation) {
    const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
    ctx.translate(cx, cy); ctx.rotate((o.rotation * Math.PI) / 180); ctx.translate(-cx, -cy);
  }
  applyShadow(ctx, o.shadow, quality);
  if (o.kind === 'rect') {
    ctx.fillStyle = o.fill ?? 'transparent';
    roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius);
    if (o.fill) ctx.fill();
    if (o.stroke && o.stroke.width > 0) { ctx.strokeStyle = o.stroke.color; ctx.lineWidth = o.stroke.width; ctx.stroke(); }
  } else {
    ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(); }
    if (o.stroke && o.stroke.width > 0) { ctx.strokeStyle = o.stroke.color; ctx.lineWidth = o.stroke.width; ctx.stroke(); }
  }
  clearShadow(ctx);
  ctx.restore();
}

/* ── arrow ──────────────────────────────────────────────────────────────── */
export function chibuikeArrowPath(o: Extract<ChibuikeObject, { kind: 'arrow' }>): { mid: { x: number; y: number } } {
  return { mid: { x: (o.x + o.x2) / 2, y: (o.y + o.y2) / 2 } };
}

function chibuikePaintArrow(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'arrow' }>): void {
  const dx = o.x2 - o.x, dy = o.y2 - o.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const bulge = o.curve * len * 0.25;
  const mx = (o.x + o.x2) / 2 + nx * bulge;
  const my = (o.y + o.y2) / 2 + ny * bulge;
  const head = o.width * 3.2 * o.head;
  const drawHead = (px: number, py: number, dirx: number, diry: number) => {
    const ang = Math.atan2(diry, dirx);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px - head * Math.cos(ang - 0.42), py - head * Math.sin(ang - 0.42));
    ctx.lineTo(px - head * Math.cos(ang + 0.42), py - head * Math.sin(ang + 0.42));
    ctx.closePath();
    ctx.fillStyle = o.color;
    ctx.fill();
  };
  ctx.save();
  ctx.strokeStyle = o.color; ctx.lineWidth = o.width; ctx.lineCap = 'round';
  if (o.dashed) ctx.setLineDash([o.width * 3, o.width * 2.4]);
  ctx.beginPath();
  ctx.moveTo(o.x, o.y);
  if (o.curve) ctx.quadraticCurveTo(mx, my, o.x2, o.y2); else ctx.lineTo(o.x2, o.y2);
  ctx.stroke();
  ctx.setLineDash([]);
  // head direction = curve tangent at the end
  const tang = o.curve
    ? { x: o.x2 - mx, y: o.y2 - my }
    : { x: dx, y: dy };
  const tl = Math.hypot(tang.x, tang.y) || 1;
  drawHead(o.x2, o.y2, tang.x / tl, tang.y / tl);
  if (o.double) {
    const tang2 = o.curve ? { x: o.x - mx, y: o.y - my } : { x: -dx, y: -dy };
    const tl2 = Math.hypot(tang2.x, tang2.y) || 1;
    drawHead(o.x, o.y, tang2.x / tl2, tang2.y / tl2);
  }
  ctx.restore();
}

function chibuikePaintPen(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'pen' }>): void {
  if (o.points.length < 2) return;
  ctx.save();
  ctx.globalAlpha *= o.alpha;
  ctx.strokeStyle = o.color; ctx.lineWidth = o.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(o.points[0].x, o.points[0].y);
  for (let i = 1; i < o.points.length - 1; i++) {
    const mx = (o.points[i].x + o.points[i + 1].x) / 2;
    const my = (o.points[i].y + o.points[i + 1].y) / 2;
    ctx.quadraticCurveTo(o.points[i].x, o.points[i].y, mx, my);
  }
  const last = o.points[o.points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
  ctx.restore();
}

/* ── redaction (blur / pixelate / solid) — computed fresh, never baked ──── */
function chibuikePaintRedact(ctx: CanvasRenderingContext2D, doc: ChibuikeDoc, o: Extract<ChibuikeObject, { kind: 'blur' }>): void {
  const x = Math.floor(o.x), y = Math.floor(o.y);
  const w = Math.max(2, Math.ceil(o.w)), h = Math.max(2, Math.ceil(o.h));
  if (x >= doc.width || y >= doc.height) return;
  const cw = Math.min(w, Math.ceil(doc.width - x)), ch = Math.min(h, Math.ceil(doc.height - y));
  if (o.mode === 'solid') {
    ctx.save();
    ctx.fillStyle = o.color;
    regionPath(ctx, { shape: o.shape, x: o.x, y: o.y, w: o.w, h: o.h, radius: 6 });
    ctx.fill();
    ctx.restore();
    return;
  }
  // grab what's *below* this object right now — non-destructive, live
  const region = scratch('b', cw, ch);
  const rctx = region.getContext('2d')!;
  rctx.drawImage(ctx.canvas, x, y, cw, ch, 0, 0, cw, ch);
  if (o.mode === 'pixelate') {
    const block = Math.max(2, o.strength);
    const tw = Math.max(1, Math.floor(cw / block)), th = Math.max(1, Math.floor(ch / block));
    const tiny = scratch('a', tw, th);
    const tctx = tiny.getContext('2d')!;
    tctx.imageSmoothingEnabled = true;
    tctx.drawImage(region, 0, 0, tw, th);
    rctx.imageSmoothingEnabled = false;
    rctx.clearRect(0, 0, cw, ch);
    rctx.drawImage(tiny, 0, 0, tw, th, 0, 0, cw, ch);
    rctx.imageSmoothingEnabled = true;
  } else {
    const strength = Math.max(2, o.strength);
    const small = scratch('a', Math.max(1, Math.round(cw / strength)), Math.max(1, Math.round(ch / strength)));
    const sctx = small.getContext('2d')!;
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(region, 0, 0, small.width, small.height);
    rctx.clearRect(0, 0, cw, ch);
    rctx.imageSmoothingEnabled = true;
    rctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, cw, ch);
    rctx.drawImage(small, 0, 0, small.width, small.height, 0, 0, cw, ch); // double = stronger
  }
  ctx.save();
  regionPath(ctx, { shape: o.shape, x: o.x, y: o.y, w: o.w, h: o.h, radius: 6 });
  ctx.clip();
  if (o.feather > 0) {
    // soften edges: draw the mask with a feathered alpha gradient border
    ctx.drawImage(region, x, y);
    ctx.globalCompositeOperation = 'destination-out';
    const f = o.feather;
    const g = ctx.createLinearGradient(x, y, x + w, y);
    // simple approach: radial feather via stroke of the path with blur
    ctx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.filter = `blur(${f / 2}px)`;
    ctx.globalCompositeOperation = 'copy';
    ctx.filter = 'none';
    ctx.restore();
    // Chibuike: pragmatic feather — stroke the clip path with low-alpha eraser
    ctx.globalCompositeOperation = 'destination-in';
    const inner = scratch('a', cw, ch);
    const ictx = inner.getContext('2d')!;
    ictx.clearRect(0, 0, cw, ch);
    ictx.filter = `blur(${f / 2}px)`;
    ictx.fillStyle = '#fff';
    regionPath(ictx, { shape: o.shape, x: -x, y: -y, w: cw, h: ch, radius: 6 });
    ictx.fill();
    ictx.filter = 'none';
    ctx.drawImage(inner, x, y);
  } else {
    ctx.drawImage(region, x, y);
  }
  ctx.restore();
}

/* ── spotlight: outside dims, inside shines ─────────────────────────────── */
function chibuikePaintSpotlight(ctx: CanvasRenderingContext2D, doc: ChibuikeDoc, o: Extract<ChibuikeObject, { kind: 'spotlight' }>): void {
  const dim = scratch('b', doc.width, doc.height);
  const dctx = dim.getContext('2d')!;
  dctx.clearRect(0, 0, doc.width, doc.height);
  dctx.fillStyle = `rgba(8,10,16,${o.dim})`;
  dctx.fillRect(0, 0, doc.width, doc.height);
  dctx.globalCompositeOperation = 'destination-out';
  dctx.filter = o.feather > 0 ? `blur(${o.feather}px)` : 'none';
  dctx.fillStyle = '#fff';
  regionPath(dctx, { shape: o.shape, x: o.x, y: o.y, w: o.w, h: o.h });
  dctx.fill();
  dctx.filter = 'none';
  ctx.drawImage(dim, 0, 0);
  if (o.ring && o.ring.width > 0) {
    ctx.save();
    ctx.strokeStyle = o.ring.color; ctx.lineWidth = o.ring.width;
    regionPath(ctx, { shape: o.shape, x: o.x, y: o.y, w: o.w, h: o.h });
    ctx.stroke();
    ctx.restore();
  }
}

/* ── number marker ──────────────────────────────────────────────────────── */
function chibuikePaintNumber(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'number' }>, quality: number): void {
  ctx.save();
  applyShadow(ctx, o.shadow, quality);
  ctx.fillStyle = o.fill;
  if (o.style === 'circle') {
    ctx.beginPath(); ctx.ellipse(o.x + o.w / 2, o.y + o.h / 2, o.w / 2, o.h / 2, 0, 0, Math.PI * 2); ctx.fill();
  } else if (o.style === 'pill') {
    roundRectPath(ctx, o.x, o.y, o.w, o.h, o.h / 2); ctx.fill();
  } else {
    roundRectPath(ctx, o.x, o.y, o.w, o.h, Math.min(10, o.w / 5)); ctx.fill();
  }
  clearShadow(ctx);
  ctx.fillStyle = o.textColor;
  ctx.font = `700 ${o.fontSize}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(o.n), o.x + o.w / 2, o.y + o.h / 2 + 1);
  ctx.restore();
}

/* ── callout bubble ─────────────────────────────────────────────────────── */
function chibuikePaintCallout(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'callout' }>, quality: number): void {
  ctx.save();
  if (o.shadow) { applyShadow(ctx, o.shadow, quality); ctx.fillStyle = o.fill; roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius); ctx.fill(); clearShadow(ctx); }
  ctx.beginPath();
  roundRectPath(ctx, o.x, o.y, o.w, o.h, o.radius);
  ctx.fillStyle = o.fill; ctx.fill();
  if (o.shadow) { ctx.shadowColor = 'transparent'; }
  // tail triangle toward the tip
  const anchor =
    o.tail === 'bl' ? { x: o.x + o.w * 0.22, y: o.y + o.h } :
    o.tail === 'br' ? { x: o.x + o.w * 0.78, y: o.y + o.h } :
    o.tail === 'tl' ? { x: o.x + o.w * 0.22, y: o.y } :
    { x: o.x + o.w * 0.78, y: o.y };
  const tx = o.tailX, ty = o.tailY;
  const perp = 10;
  const ang = Math.atan2(ty - anchor.y, tx - anchor.x);
  const bx1 = anchor.x + Math.cos(ang + Math.PI / 2) * perp;
  const by1 = anchor.y + Math.sin(ang + Math.PI / 2) * perp;
  const bx2 = anchor.x + Math.cos(ang - Math.PI / 2) * perp;
  const by2 = anchor.y + Math.sin(ang - Math.PI / 2) * perp;
  ctx.beginPath();
  ctx.moveTo(bx1, by1); ctx.lineTo(tx, ty); ctx.lineTo(bx2, by2);
  ctx.closePath();
  ctx.fillStyle = o.fill; ctx.fill();
  // text
  ctx.fillStyle = o.textColor;
  ctx.font = `${o.weight} ${o.fontSize}px ${o.font === 'var-chibuike-sans' ? 'sans-serif' : o.font}`;
  ctx.textBaseline = 'top';
  const lines = chibuikeWrapText(ctx, o.text, { font: o.font, size: o.fontSize, weight: o.weight, letterSpacing: 0, lineHeight: 1.3 }, o.w - 24);
  let ty2 = o.y + (o.h - lines.length * o.fontSize * 1.3) / 2 + 2;
  for (const ln of lines) {
    const lw = chibuikeMeasureLine(ctx, ln, { font: o.font, size: o.fontSize, weight: o.weight, letterSpacing: 0, lineHeight: 1.3 });
    ctx.fillText(ln, o.x + (o.w - lw) / 2, ty2);
    ty2 += o.fontSize * 1.3;
  }
  ctx.restore();
}

/* ── QR (crisp vector modules — sharp at any zoom) ──────────────────────── */
function chibuikePaintQr(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'qr' }>): void {
  const grid = chibuikeQRModules(o.data, o.ec);
  if (!grid) {
    ctx.fillStyle = '#f0f1f5'; roundRectPath(ctx, o.x, o.y, o.w, o.h, 10); ctx.fill();
    return;
  }
  const n = grid.length + o.quiet * 2;
  const cell = Math.min(o.w, o.h) / n;
  const size = cell * n;
  const ox = o.x + (o.w - size) / 2, oy = o.y + (o.h - size) / 2;
  ctx.fillStyle = o.light;
  roundRectPath(ctx, ox, oy, size, size, 8); ctx.fill();
  ctx.fillStyle = o.dark;
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid.length; c++) {
      if (grid[r][c]) ctx.fillRect(Math.round(ox + (c + o.quiet) * cell), Math.round(oy + (r + o.quiet) * cell), Math.ceil(cell), Math.ceil(cell));
    }
  }
}

/* ── icon (svg path in 24x24) ───────────────────────────────────────────── */
function chibuikePaintIcon(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'icon' }>): void {
  const s = Math.min(o.w, o.h) / 24;
  ctx.save();
  ctx.translate(o.x + (o.w - 24 * s) / 2, o.y + (o.h - 24 * s) / 2);
  ctx.scale(s, s);
  const p = new Path2D(o.path);
  if (o.fill) { ctx.fillStyle = o.fill; ctx.fill(p); }
  if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeWidth; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p); }
  ctx.restore();
}

/* ── magnify cutout ─────────────────────────────────────────────────────── */
function chibuikePaintMagnify(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'magnify' }>, quality: number): void {
  const reg = chibuikeResolveAssetRegion(o.assetId, { sx: o.srcRect.sx, sy: o.srcRect.sy, sw: o.srcRect.sw, sh: o.srcRect.sh }, o.w * 2);
  if (!reg.src) return;
  const r = Math.min(o.w, o.h) / 2;
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  ctx.save();
  if (o.shadow) { applyShadow(ctx, o.shadow, quality); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); clearShadow(ctx); }
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  // cover-map the magnified region into the circle box
  const arBox = 1; // box is square
  const arSrc = reg.sw / reg.sh;
  let sx = reg.sx, sy = reg.sy, sw = reg.sw, sh = reg.sh;
  if (arSrc > arBox) { const nw = sh * arBox; sx += (sw - nw) / 2; sw = nw; }
  else { const nh = sw / arBox; sy += (sh - nh) / 2; sh = nh; }
  ctx.drawImage(reg.src as CanvasImageSource, sx, sy, sw, sh, o.x, o.y, o.w, o.h);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = o.ring.color; ctx.lineWidth = o.ring.width;
  ctx.stroke();
  ctx.restore();
}

/* ── badges (procedural interpretation — marks belong to their owners) ──── */
function chibuikePaintBadge(ctx: CanvasRenderingContext2D, o: Extract<ChibuikeObject, { kind: 'badge' }>, quality: number): void {
  ctx.save();
  applyShadow(ctx, o.shadow, quality);
  ctx.fillStyle = o.fill;
  roundRectPath(ctx, o.x, o.y, o.w, o.h, Math.min(12, o.h / 4));
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = o.textColor === '#ffffff' ? 'rgba(255,255,255,.55)' : 'rgba(0,0,0,.4)';
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, o.x, o.y, o.w, o.h, Math.min(12, o.h / 4));
  ctx.stroke();
  const pad = o.h * 0.16;
  // glyph: simple original marks (not copies of proprietary logos)
  ctx.fillStyle = o.textColor;
  if (o.store === 'appstore') {
    ctx.beginPath();
    ctx.moveTo(o.x + pad, o.y + o.h * 0.26);
    ctx.lineTo(o.x + pad + o.h * 0.4, o.y + o.h * 0.26);
    ctx.lineTo(o.x + pad + o.h * 0.2, o.y + o.h * 0.72);
    ctx.closePath(); ctx.fill();
  } else if (o.store === 'gplay') {
    ctx.beginPath();
    ctx.moveTo(o.x + pad, o.y + o.h * 0.24);
    ctx.lineTo(o.x + pad + o.h * 0.42, o.y + o.h * 0.5);
    ctx.lineTo(o.x + pad, o.y + o.h * 0.76);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.font = `700 ${o.h * 0.42}px sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('★', o.x + pad, o.y + o.h * 0.52);
  }
  const textX = o.x + pad + o.h * 0.55;
  ctx.fillStyle = o.textColor;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.font = `500 ${o.h * 0.22}px sans-serif`;
  ctx.fillText(o.top.slice(0, 24), textX, o.y + o.h * 0.4);
  ctx.font = `700 ${o.h * 0.3}px sans-serif`;
  ctx.fillText(o.bottom.slice(0, 24), textX, o.y + o.h * 0.72);
  ctx.restore();
}

/* ── watermark pass ─────────────────────────────────────────────────────── */
export function chibuikePaintWatermark(ctx: CanvasRenderingContext2D, doc: ChibuikeDoc): void {
  const w = doc.watermark;
  if (!w || !w.text.trim()) return;
  ctx.save();
  ctx.globalAlpha = w.opacity;
  ctx.font = `700 ${w.size}px sans-serif`;
  const tw = ctx.measureText(w.text).width;
  const m = w.margin;
  const col = w.position % 3, row = Math.floor(w.position / 3);
  const x = col === 0 ? m : col === 1 ? (doc.width - tw) / 2 : doc.width - tw - m;
  const y = row === 0 ? m + w.size : row === 1 ? (doc.height - w.size) / 2 + w.size * 0.35 : doc.height - m;
  ctx.fillStyle = w.color;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(w.text, x, y);
  ctx.restore();
}

/* ── full scene ─────────────────────────────────────────────────────────── */
export function chibuikePaintScene(
  ctx: CanvasRenderingContext2D,
  doc: ChibuikeDoc,
  opts?: { transparentOverride?: boolean; quality?: number; lowEnd?: boolean; time?: number },
): void {
  ctx.save();
  chibuikePaintBackground(ctx, doc, opts);
  for (const o of doc.objects) {
    if (!o.visible) continue;
    const painted = opts?.time !== undefined ? chibuikeApplyAnim(ctx, o, opts.time, doc) : true;
    if (!painted) continue;
    chibuikePaintObject(ctx, doc, o, { quality: opts?.quality ?? 1, lowEnd: opts?.lowEnd });
  }
  chibuikePaintWatermark(ctx, doc);
  ctx.restore();
}

/** returns false if the object is fully outside its animation window */
function chibuikeApplyAnim(ctx: CanvasRenderingContext2D, o: ChibuikeObject, time: number, doc: ChibuikeDoc): boolean {
  const a = o.anim;
  if (!a || a.preset === 'none') return true;
  const t = time - a.delay;
  const total = a.duration;
  let p = 0;
  if (a.loop && a.preset === 'float') p = (Math.sin(time * Math.PI * 2 / total) + 1) / 2 * 0.4 + 0.3;
  else if (a.loop && a.preset === 'pulse') p = (Math.sin(time * Math.PI * 2 / total) + 1) / 2;
  else if (a.loop && a.preset === 'shake') p = Math.sin(time * Math.PI * 2 * 6 / total) * (1 - t / total);
  else {
    if (t <= 0) return false;
    p = Math.min(1, t / total);
    p = chibuikeEase(p, a.easing);
  }
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  switch (a.preset) {
    case 'fade': ctx.globalAlpha *= p; break;
    case 'slide-up': ctx.globalAlpha *= Math.min(1, p * 1.6); ctx.translate(0, (1 - p) * 40); break;
    case 'slide-down': ctx.globalAlpha *= Math.min(1, p * 1.6); ctx.translate(0, -(1 - p) * 40); break;
    case 'slide-left': ctx.globalAlpha *= Math.min(1, p * 1.6); ctx.translate((1 - p) * 40, 0); break;
    case 'slide-right': ctx.globalAlpha *= Math.min(1, p * 1.6); ctx.translate(-(1 - p) * 40, 0); break;
    case 'scale': ctx.globalAlpha *= Math.min(1, p * 1.5); ctx.translate(cx, cy); ctx.scale(0.7 + 0.3 * p, 0.7 + 0.3 * p); ctx.translate(-cx, -cy); break;
    case 'pop': ctx.globalAlpha *= Math.min(1, p * 2); { const s = 0.6 + 0.4 * p + Math.sin(p * Math.PI) * 0.08; ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); } break;
    case 'bounce': ctx.globalAlpha *= Math.min(1, p * 2); ctx.translate(0, (1 - p) * -60 * Math.abs(Math.cos(p * Math.PI * 2))); break;
    case 'rotate': ctx.globalAlpha *= Math.min(1, p * 1.5); ctx.translate(cx, cy); ctx.rotate((1 - p) * 0.6); ctx.translate(-cx, -cy); break;
    case 'blur-in': ctx.globalAlpha *= p; ctx.filter = `blur(${(1 - p) * 12}px)`; break;
    case 'wipe': { ctx.beginPath(); ctx.rect(0, 0, doc.width * p, doc.height); ctx.clip(); } break;
    default: break;
  }
  return true;
}

export function chibuikeEase(p: number, easing: string): number {
  switch (easing) {
    case 'linear': return p;
    case 'ease-in': return p * p;
    case 'ease-out': return 1 - (1 - p) * (1 - p);
    case 'ease-in-out': return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    case 'spring': { const c = 1.7; return 1 - Math.cos(p * Math.PI * c) * Math.exp(-p * 4) * 0.5 - (1 - p) * 0.0; }
    case 'bounce-out': {
      const n1 = 7.5625, d1 = 2.75;
      let x = p;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
    case 'back-out': { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
    default: return 1 - Math.pow(1 - p, 3);
  }
}

export { roundRectPath, applyShadow, clearShadow, regionPath, drawFitted, imageRegion, filterCss };
