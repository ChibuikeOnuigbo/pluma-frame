/**
 * Chibuike export desk — the scene painter rendered offscreen at the REQUESTED
 * resolution. Preview optimizations (small DPR, preview bitmaps) never leak
 * into exports. Formats: PNG / JPEG / WebP / SVG (vector-safe docs) / WebM
 * (animated docs). Export-safety warnings computed before any pixels move.
 */
import { ChibuikeDoc, ChibuikeObject } from './chibuikeTypes';
import { chibuikePaintScene, chibuikePaintBackground } from './chibuikeRender';
import { chibuikeReflowDoc } from './chibuikeDoc';
import { chibuikeFontStack } from './chibuikeText';
import { store } from './chibuikeStore';

export interface ChibuikeExportWarning { level: 'warn' | 'info'; msg: string; }

export function chibuikeExportWarnings(doc: ChibuikeDoc, scale: number): ChibuikeExportWarning[] {
  const out: ChibuikeExportWarning[] = [];
  const w = doc.width * scale, h = doc.height * scale;
  if (w * h > 40_000_000) out.push({ level: 'warn', msg: `Huge output: ${Math.round(w)}×${Math.round(h)} (${(w * h / 1e6).toFixed(0)}MP). Browsers may fail above ~40MP — lower the scale.` });
  else if (w > 8192 || h > 8192) out.push({ level: 'warn', msg: `Output ${Math.round(w)}×${Math.round(h)} exceeds the safe 8192px edge for canvas exports on some GPUs.` });
  const remote = doc.assets.filter(a => a.origin === 'remote' && !a.src);
  if (remote.length) out.push({ level: 'warn', msg: `${remote.length} remote asset(s) may be skipped if their host blocks cross-origin loading.` });
  if (doc.watermark && doc.watermark.opacity > 0.5) out.push({ level: 'info', msg: 'Watermark is prominent — remember your own branding.' });
  return out;
}

export async function chibuikeRenderToCanvas(doc: ChibuikeDoc, scale: number): Promise<HTMLCanvasElement> {
  const c = document.createElement('canvas');
  c.width = Math.round(doc.width * scale);
  c.height = Math.round(doc.height * scale);
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  chibuikePaintScene(ctx, doc, { quality: 1, lowEnd: false });
  return c;
}

export async function chibuikeEncode(doc: ChibuikeDoc, format: 'png' | 'jpeg' | 'webp', scale: number, quality: number, transparent: boolean): Promise<Blob> {
  const c = await chibuikeRenderToCanvas(doc, scale);
  const mime = format === 'png' ? 'image/png' : format === 'jpeg' ? 'image/jpeg' : 'image/webp';
  const q = format === 'png' ? undefined : quality;
  const transparentOK = format === 'png' || format === 'webp';
  const blob = await new Promise<Blob | null>(res => c.toBlob(res, mime, q));
  if (!blob) throw new Error('The browser refused to encode this image (size limits?).');
  if (!transparentOK) void transparent;
  return blob;
}

export function chibuikeDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000); // Chibuike hygiene: no URL leaks
}

export async function chibuikeCopyToClipboard(doc: ChibuikeDoc, scale: number): Promise<void> {
  const blob = await chibuikeEncode(doc, 'png', scale, 1, doc.exportSettings.transparent);
  const item = new ClipboardItem({ 'image/png': blob });
  await navigator.clipboard.write([item]);
}

export function chibuikeExportSVG(doc: ChibuikeDoc, embedImages: boolean): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">`);
  // background (solid/linear only — mesh/pattern fall back to base color in SVG)
  const bg = doc.background;
  if (bg.type === 'solid') parts.push(`<rect width="100%" height="100%" fill="${bg.color}"/>`);
  else if (bg.type === 'linear') {
    const id = 'bgGrad';
    parts.push(`<defs><linearGradient id="${id}" gradientTransform="rotate(${bg.angle} .5 .5)">`);
    for (const s of bg.stops) parts.push(`<stop offset="${s.o}" stop-color="${s.color}"/>`);
    parts.push(`</linearGradient></defs><rect width="100%" height="100%" fill="url(#${id})"/>`);
  } else if (bg.type !== 'transparent') {
    const base = bg.type === 'pattern' ? bg.base : bg.type === 'mesh' ? bg.base : '#ffffff';
    parts.push(`<rect width="100%" height="100%" fill="${base}"/>`);
  }
  for (const o of doc.objects) {
    if (!o.visible) continue;
    const tr = o.rotation ? ` transform="rotate(${o.rotation} ${o.x + o.w / 2} ${o.y + o.h / 2})"` : '';
    const op = o.opacity !== 1 ? ` opacity="${o.opacity}"` : '';
    switch (o.kind) {
      case 'rect':
        parts.push(`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="${o.radius}" fill="${o.fill ?? 'none'}" ${o.stroke ? `stroke="${o.stroke.color}" stroke-width="${o.stroke.width}"` : ''}${tr}${op}/>`);
        break;
      case 'ellipse':
        parts.push(`<ellipse cx="${o.x + o.w / 2}" cy="${o.y + o.h / 2}" rx="${o.w / 2}" ry="${o.h / 2}" fill="${o.fill ?? 'none'}" ${o.stroke ? `stroke="${o.stroke.color}" stroke-width="${o.stroke.width}"` : ''}${tr}${op}/>`);
        break;
      case 'line':
        parts.push(`<line x1="${o.x}" y1="${o.y}" x2="${o.x2}" y2="${o.y2}" stroke="${o.color}" stroke-width="${o.width}" stroke-linecap="round"${op}/>`);
        break;
      case 'icon':
        parts.push(`<g transform="translate(${o.x} ${o.y}) scale(${o.w / 24} ${o.h / 24})${o.rotation ? '' : ''}"><path d="${o.path}" fill="${o.fill}"${op}/></g>`);
        break;
      case 'text': {
        const size = o.size, lh = size * o.lineHeight;
        const lines = o.text.split('\n');
        parts.push(`<text x="${o.x}" y="${o.y + size}" font-family="${esc(chibuikeFontStack(o.font))}" font-size="${size}" font-weight="${o.weight}" fill="${o.color}" text-anchor="${o.align === 'center' ? 'middle' : o.align === 'right' ? 'end' : 'start'}"${op}>`);
        for (let i = 0; i < lines.length; i++) parts.push(`<tspan x="${o.x}" dy="${i === 0 ? 0 : lh}">${esc(lines[i])}</tspan>`);
        parts.push(`</text>`);
        break;
      }
      case 'image': case 'mockup': {
        const aid = (o as { assetId?: string }).assetId;
        const a = doc.assets.find(x => x.id === aid);
        if (a?.src && embedImages) parts.push(`<image x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" href="${a.src}"${tr}${op}/>`);
        else if (aid) parts.push(`<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="#dde1ea"${tr}${op}/>`);
        break;
      }
      default: break;
    }
  }
  parts.push('</svg>');
  return parts.join('\n');
}

/** Multi-size export: one composition, many canvases, smart reflow. */
export async function chibuikeExportSizes(doc: ChibuikeDoc, sizes: { name: string; w: number; h: number }[], scale: number, format: 'png' | 'jpeg' | 'webp'): Promise<void> {
  for (const s of sizes) {
    const scaled = chibuikeReflowDoc(doc, s.w, s.h, 'scale');
    const blob = await chibuikeEncode(scaled, format, scale, doc.exportSettings.quality, false);
    chibuikeDownload(blob, `${doc.name || 'pluma'}-${s.name}-${s.w}x${s.h}.${format === 'jpeg' ? 'jpg' : format}`);
    await new Promise(r => setTimeout(r, 350)); // let the browser settle downloads
  }
}

export const CHIBUIKE_SOCIAL_SIZES: { name: string; w: number; h: number }[] = [
  { name: 'X Post', w: 1600, h: 900 },
  { name: 'LinkedIn', w: 1200, h: 627 },
  { name: 'IG Square', w: 1080, h: 1080 },
  { name: 'IG Portrait', w: 1080, h: 1350 },
  { name: 'IG Landscape', w: 1080, h: 566 },
  { name: 'Facebook', w: 1200, h: 630 },
  { name: 'Product Hunt', w: 1270, h: 760 },
  { name: 'Dribbble', w: 1600, h: 1200 },
  { name: 'Blog Hero', w: 1600, h: 840 },
];

export const CHIBUIKE_DEVICE_SIZES: { name: string; w: number; h: number }[] = [
  { name: 'Phone 6.7"', w: 1290, h: 2796 },
  { name: 'Tablet 13"', w: 2064, h: 2752 },
  { name: 'Desktop', w: 1440, h: 900 },
];
