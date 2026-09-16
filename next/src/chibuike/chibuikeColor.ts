// Chibuike color lab — hex/rgb plumbing + dominant-color extraction from an image.
// Chibuike: the "random background" button reads the *actual* pixels, never guesses.

export function chibuikeHexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function chibuikeRgbToHex(r: number, g: number, b: number): string {
  const f = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
export function chibuikeWithAlpha(hex: string, alpha: number): string {
  const [r, g, b] = chibuikeHexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
export function chibuikeMix(a: string, b: string, t: number): string {
  const A = chibuikeHexToRgb(a), B = chibuikeHexToRgb(b);
  return chibuikeRgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
export function chibuikeLuminance(hex: string): number {
  const [r, g, b] = chibuikeHexToRgb(hex).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function chibuikeReadOn(hex: string): string {
  return chibuikeLuminance(hex) > 0.4 ? '#14161d' : '#ffffff';
}

export interface ChibuikeSwatch { color: string; count: number; }

/** Coarse quantize + pick vibrant & neutral swatches from an image. Runs on a
 *  tiny downscale — this must stay cheap even on 8K screenshots. */
export function chibuikePaletteFromCanvas(source: CanvasImageSource, max = 64): ChibuikeSwatch[] {
  const N = 64;
  const c = document.createElement('canvas');
  c.width = N; c.height = N;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];

  ctx.drawImage(source, 0, 0, N, N);
  const bins = new Map<number, number>();
  let data: Uint8ClampedArray;
  try { data = ctx.getImageData(0, 0, N, N).data; } catch { return []; }
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }
  const swatches: ChibuikeSwatch[] = [...bins.entries()]
    .map(([key, count]) => ({
      color: chibuikeRgbToHex(((key >> 8) & 15) * 17, ((key >> 4) & 15) * 17, (key & 15) * 17),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, max);
  return swatches;
}

/** Constrained randomness: pick a professional-feeling pair from real image colors. */
export function chibuikeGradientFromPalette(swatches: ChibuikeSwatch[], seed = Math.random()): { stops: { o: number; color: string }[]; angle: number } {
  if (!swatches.length) return { stops: [{ o: 0, color: '#e8ebf5' }, { o: 1, color: '#c7cee0' }], angle: 120 };
  const i = Math.floor(seed * swatches.length);
  const j = (i + 3 + Math.floor(seed * 5)) % swatches.length;
  let a = swatches[i].color, b = swatches[j].color;
  if (chibuikeMix(a, b, 0.5) === a) b = chibuikeMix(b, '#ffffff', 0.35);
  return { stops: [{ o: 0, color: a }, { o: 1, color: b }], angle: Math.round(90 + seed * 120) };
}

/** Curated mesh presets — presets first, tinkering second. */
export const chibuikeMeshPresets: { name: string; base: string; points: { x: number; y: number; r: number; color: string }[] }[] = [
  { name: 'Aurora', base: '#0e1020', points: [{ x: 0.15, y: 0.2, r: 0.55, color: '#7c5cff' }, { x: 0.85, y: 0.3, r: 0.5, color: '#22d3ee' }, { x: 0.5, y: 0.9, r: 0.6, color: '#f472b6' }] },
  { name: 'Peach', base: '#fff4ec', points: [{ x: 0.2, y: 0.25, r: 0.5, color: '#ffd6c2' }, { x: 0.8, y: 0.4, r: 0.55, color: '#ffb4a2' }, { x: 0.4, y: 0.85, r: 0.5, color: '#ffe8d6' }] },
  { name: 'Mint', base: '#f0fdf9', points: [{ x: 0.25, y: 0.3, r: 0.5, color: '#99f6e4' }, { x: 0.75, y: 0.6, r: 0.55, color: '#a7f3d0' }, { x: 0.5, y: 0.1, r: 0.4, color: '#bae6fd' }] },
  { name: 'Dusk', base: '#111318', points: [{ x: 0.3, y: 0.25, r: 0.55, color: '#312e81' }, { x: 0.75, y: 0.55, r: 0.5, color: '#7c3aed' }, { x: 0.35, y: 0.85, r: 0.45, color: '#1e3a8a' }] },
  { name: 'Sunrise', base: '#fffbeb', points: [{ x: 0.25, y: 0.3, r: 0.5, color: '#fde68a' }, { x: 0.8, y: 0.35, r: 0.5, color: '#fca5a5' }, { x: 0.5, y: 0.9, r: 0.55, color: '#fdba74' }] },
  { name: 'Slate', base: '#f4f6fb', points: [{ x: 0.2, y: 0.2, r: 0.5, color: '#dbe3f5' }, { x: 0.8, y: 0.5, r: 0.55, color: '#c3cde8' }, { x: 0.45, y: 0.9, r: 0.5, color: '#e2e8f0' }] },
];
