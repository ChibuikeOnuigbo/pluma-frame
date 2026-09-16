// Chibuike object factories — sane defaults so every new object looks good instantly.
import {
  ChibuikeObject, ChibuikeTextObject, ChibuikeShapeObject, ChibuikeArrowObject,
  ChibuikeBlurObject, ChibuikeSpotlightObject, ChibuikeNumberObject, ChibuikeCalloutObject,
  ChibuikeQrObject, ChibuikeIconObject, ChibuikeMockupObject, ChibuikeBadgeObject,
  ChibuikeImageObject, ChibuikeMagnifyObject, ChibuikePenObject, ChibuikeLineObject,
} from './chibuikeTypes';
import { chibuikeId } from './chibuikeIds';
import { chibuikeNeutralFilters } from './chibuikeTypes';

const base = (kind: ChibuikeObject['kind'], name: string) => ({
  id: chibuikeId(kind.slice(0, 2)),
  name,
  kind,
  x: 0, y: 0, w: 100, h: 100,
  rotation: 0, opacity: 1, visible: true, locked: false,
  blend: 'normal' as const, groupId: null, anim: null,
});

export function chibuikeMakeText(text: string, x: number, y: number, over?: Partial<ChibuikeTextObject>): ChibuikeTextObject {
  return {
    ...base('text', text.slice(0, 24) || 'Text'),
    kind: 'text', x, y, w: 320, h: 44,
    text, font: 'var-chibuike-sans', size: 40, weight: 700, color: '#1a1d27',
    align: 'left', lineHeight: 1.25, letterSpacing: 0,
    bg: null, stroke: null, shadow: null, transform: 'none', autoFit: true,
    ...over,
  } as ChibuikeTextObject;
}

export function chibuikeMakeRect(x: number, y: number, over?: Partial<ChibuikeShapeObject>): ChibuikeShapeObject {
  return { ...base('rect', 'Rectangle'), kind: 'rect', x, y, w: 220, h: 140, fill: '#7c5cff', stroke: null, radius: 12, shadow: null, ...over } as ChibuikeShapeObject;
}
export function chibuikeMakeEllipse(x: number, y: number, over?: Partial<ChibuikeShapeObject>): ChibuikeShapeObject {
  return { ...base('ellipse', 'Ellipse'), kind: 'ellipse', x, y, w: 160, h: 160, fill: '#4cc2ff', stroke: null, radius: 0, shadow: null, ...over } as ChibuikeShapeObject;
}
export function chibuikeMakeLine(x: number, y: number, x2: number, y2: number, over?: Partial<ChibuikeLineObject>): ChibuikeLineObject {
  return { ...base('line', 'Line'), kind: 'line', x, y, w: Math.abs(x2 - x), h: Math.abs(y2 - y), x2, y2, width: 4, color: '#1a1d27', ...over } as ChibuikeLineObject;
}
export function chibuikeMakeArrow(x: number, y: number, x2: number, y2: number, over?: Partial<ChibuikeArrowObject>): ChibuikeArrowObject {
  return {
    ...base('arrow', 'Arrow'), kind: 'arrow', x, y, w: Math.abs(x2 - x), h: Math.abs(y2 - y),
    x2, y2, width: 5, color: '#e11d48', head: 1.6, curve: 0.18, double: false, dashed: false, ...over,
  } as ChibuikeArrowObject;
}
export function chibuikeMakePen(points: { x: number; y: number }[], over?: Partial<ChibuikePenObject>): ChibuikePenObject {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { ...base('pen', 'Stroke'), kind: 'pen', x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y, points, width: 5, color: '#1a1d27', alpha: 1, ...over } as ChibuikePenObject;
}
export function chibuikeMakeBlur(x: number, y: number, w: number, h: number, over?: Partial<ChibuikeBlurObject>): ChibuikeBlurObject {
  return { ...base('blur', 'Redact'), kind: 'blur', x, y, w, h, shape: 'rect', mode: 'pixelate', strength: 18, feather: 6, color: '#0b0c10', ...over } as ChibuikeBlurObject;
}
export function chibuikeMakeSpotlight(x: number, y: number, w: number, h: number, over?: Partial<ChibuikeSpotlightObject>): ChibuikeSpotlightObject {
  return { ...base('spotlight', 'Spotlight'), kind: 'spotlight', x, y, w, h, shape: 'ellipse', dim: 0.45, feather: 30, ring: { width: 4, color: '#7c5cff' }, ...over } as ChibuikeSpotlightObject;
}
export function chibuikeMakeNumber(x: number, y: number, n: number, over?: Partial<ChibuikeNumberObject>): ChibuikeNumberObject {
  return { ...base('number', `Step ${n}`), kind: 'number', x, y, w: 44, h: 44, n, style: 'circle', fill: '#e11d48', textColor: '#ffffff', fontSize: 20, shadow: { x: 0, y: 3, blur: 8, spread: 0, color: '#000000', opacity: 0.25 }, ...over } as ChibuikeNumberObject;
}
export function chibuikeMakeCallout(x: number, y: number, text: string, over?: Partial<ChibuikeCalloutObject>): ChibuikeCalloutObject {
  return {
    ...base('callout', text.slice(0, 24) || 'Callout'), kind: 'callout', x, y, w: 240, h: 64,
    text, font: 'var-chibuike-sans', fontSize: 18, weight: 600, fill: '#ffffff', textColor: '#1a1d27',
    radius: 14, tail: 'bl', tailX: x + 30, tailY: y + 96,
    shadow: { x: 0, y: 6, blur: 18, spread: 0, color: '#000000', opacity: 0.18 }, ...over,
  } as ChibuikeCalloutObject;
}
export function chibuikeMakeQr(x: number, y: number, data: string, over?: Partial<ChibuikeQrObject>): ChibuikeQrObject {
  return { ...base('qr', 'QR code'), kind: 'qr', x, y, w: 160, h: 160, data, dark: '#14161d', light: '#ffffff', ec: 'M', quiet: 2, ...over } as ChibuikeQrObject;
}
export function chibuikeMakeIcon(path: string, x: number, y: number, over?: Partial<ChibuikeIconObject>): ChibuikeIconObject {
  return { ...base('icon', 'Icon'), kind: 'icon', x, y, w: 48, h: 48, path, fill: '#1a1d27', stroke: null, strokeWidth: 2, ...over } as ChibuikeIconObject;
}
export function chibuikeMakeMockup(x: number, y: number, w: number, h: number, device: ChibuikeMockupObject['device'], over?: Partial<ChibuikeMockupObject>): ChibuikeMockupObject {
  return {
    ...base('mockup', device[0].toUpperCase() + device.slice(1)), kind: 'mockup', x, y, w, h,
    device, assetId: null, fit: 'contain', radius: 8, shadow: { x: 0, y: 24, blur: 60, spread: 0, color: '#0b1020', opacity: 0.35 },
    urlText: 'example.com', tilt: null, ...over,
  } as ChibuikeMockupObject;
}
export function chibuikeMakeBadge(x: number, y: number, over?: Partial<ChibuikeBadgeObject>): ChibuikeBadgeObject {
  return { ...base('badge', 'App Store badge'), kind: 'badge', x, y, w: 180, h: 54, store: 'appstore', top: 'Download on the', bottom: 'App Store', fill: '#000000', textColor: '#ffffff', shadow: null, ...over } as ChibuikeBadgeObject;
}
export function chibuikeMakeImage(assetId: string, x: number, y: number, w: number, h: number, over?: Partial<ChibuikeImageObject>): ChibuikeImageObject {
  return {
    ...base('image', 'Image'), kind: 'image', x, y, w, h, assetId, fit: 'contain', srcRect: null,
    radius: 0, border: null, shadow: null, filters: chibuikeNeutralFilters(), flipX: false, flipY: false, tilt: null, ...over,
  } as ChibuikeImageObject;
}
export function chibuikeMakeMagnify(assetId: string, x: number, y: number, size: number, srcRect: ChibuikeMagnifyObject['srcRect'], over?: Partial<ChibuikeMagnifyObject>): ChibuikeMagnifyObject {
  return {
    ...base('magnify', 'Zoom cutout'), kind: 'magnify', x, y, w: size, h: size,
    assetId, srcRect, zoom: 1.8, ring: { width: 5, color: '#ffffff' },
    shadow: { x: 0, y: 10, blur: 30, spread: 0, color: '#000000', opacity: 0.35 }, ...over,
  } as ChibuikeMagnifyObject;
}
